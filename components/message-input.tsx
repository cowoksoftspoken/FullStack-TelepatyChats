"use client";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import {
  Camera,
  File,
  Film,
  ImageIcon,
  Lock,
  MapPin,
  Mic,
  Music,
  Plus,
  SendHorizontal,
  Smile,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFirebase } from "@/lib/firebase-provider";
import type { User } from "@/types/user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";

interface MessageInputProps {
  currentUser: User;
  contact: User;
  isBlocked: boolean;
  sendMessage: (message: string) => void;
  handleFileSelect: (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "audio" | "video" | "image" | "file"
  ) => void;
  handleShareLocation: () => void;
  startRecording: () => void;
  setIsCameraDialogOpen: (open: boolean) => void;
  isGettingLocation: boolean;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  audioInputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isEncryptionEnabled?: boolean;
  isRecording?: boolean;
}

export default function MessageInput({
  currentUser,
  contact,
  isBlocked,
  sendMessage,
  handleFileSelect,
  handleShareLocation,
  startRecording,
  setIsCameraDialogOpen,
  isGettingLocation,
  imageInputRef,
  videoInputRef,
  audioInputRef,
  fileInputRef,
  isEncryptionEnabled = true,
  isRecording,
}: MessageInputProps) {
  const { db } = useFirebase();
  const { theme } = useTheme();
  const isTypingRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stopTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [message, setMessage] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    setMessage(e.currentTarget.value);
  };

  const handleEmojiSelect = (emoji: any) => {
    setMessage((prev) => prev + emoji.native);
  };

  useEffect(() => {
    if (!currentUser || !contact) return;
    const chatId = [currentUser.uid, contact.uid].sort().join("_");
    const typingStatusRef = doc(db, "typingStatus", chatId);
    const isTyping = message.trim().length > 0;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    if (stopTypingTimeoutRef.current)
      clearTimeout(stopTypingTimeoutRef.current);
    if (isTyping) {
      debounceTimeoutRef.current = setTimeout(() => {
        if (!isTypingRef.current) {
          isTypingRef.current = true;
          updateDoc(typingStatusRef, {
            [currentUser.uid]: true,
            timestamp: new Date().toISOString(),
          }).catch(() => {
            setDoc(typingStatusRef, {
              [currentUser.uid]: true,
              timestamp: new Date().toISOString(),
            });
          });
        }
        stopTypingTimeoutRef.current = setTimeout(() => {
          isTypingRef.current = false;
          updateDoc(typingStatusRef, {
            [currentUser.uid]: false,
            timestamp: new Date().toISOString(),
          }).catch(() => {});
        }, 2000);
      }, 500);
    } else {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        updateDoc(typingStatusRef, {
          [currentUser.uid]: false,
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }
    }
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (stopTypingTimeoutRef.current)
        clearTimeout(stopTypingTimeoutRef.current);
    };
  }, [message, currentUser, contact, db]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (message.trim()) {
          sendMessage(message);
          setMessage("");
        }
      }}
      className="p-3 flex items-center bg-transparent border-t dark:bg-[#151516]"
    >
      <input
        type="file"
        ref={imageInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => handleFileSelect(e, "image")}
      />
      <input
        type="file"
        ref={videoInputRef}
        className="hidden"
        accept="video/*"
        onChange={(e) => handleFileSelect(e, "video")}
      />
      <input
        type="file"
        ref={audioInputRef}
        className="hidden"
        accept="audio/*"
        onChange={(e) => handleFileSelect(e, "audio")}
      />
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="application/*,text/*"
        onChange={(e) => handleFileSelect(e, "file")}
      />

      <div className="flex items-center w-full gap-1 rounded-full bg-white/20 dark:bg-black/30 backdrop-blur-sm border border-[#151516]/20 dark:border-white/5 p-1 transition-all duration-300 focus-within:ring-2 focus-within:ring-[#151516] dark:focus-within:shadow-white dark:focus-within:shadow-md">
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full flex-shrink-0 hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
              disabled={isBlocked}
            >
              <Plus
                className={`h-5 w-5 text-black dark:text-white transition-transform duration-300 ${
                  isMenuOpen ? "rotate-45" : ""
                }`}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 p-2 mb-2 bg-white dark:bg-[#1f1f1f] rounded-xl shadow-lg border border-gray-200 dark:border-white/10"
          >
            {isEncryptionEnabled && (
              <>
                <DropdownMenuLabel className="font-normal text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Lock className="h-3 w-3" />
                  <span>End-to-end Encrypted</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
              </>
            )}
            <DropdownMenuItem
              onClick={() => imageInputRef?.current?.click()}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer"
            >
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/40">
                <ImageIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <span>Image</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => videoInputRef?.current?.click()}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
            >
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/40">
                <Film className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span>Video</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => audioInputRef?.current?.click()}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
            >
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/40">
                <Music className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span>Audio</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => fileInputRef?.current?.click()}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors cursor-pointer"
            >
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/40">
                <File className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <span>File</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isGettingLocation}
              onClick={handleShareLocation}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/40">
                <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <span>
                {isGettingLocation ? "Getting location..." : "Location"}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setIsCameraDialogOpen(true)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors cursor-pointer"
            >
              <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/40">
                <Camera className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              </div>
              <span>Camera</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full flex-shrink-0 hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
              disabled={isBlocked}
            >
              <Smile className="h-5 w-5 text-black dark:text-white" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            className="w-72 p-0 mb-2 rounded-xl shadow-md bg-white/80 dark:bg-[#1f1f1f]/80 backdrop-blur-md border-none"
          >
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme={theme}
            />
          </PopoverContent>
        </Popover>

        <Input
          value={message}
          onInput={handleInput}
          placeholder={isBlocked ? "Cannot send messages" : "Type a message..."}
          className="flex-1 bg-transparent !outline-none !border-none !ring-0 text-sm h-9 px-2 text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400"
          disabled={isBlocked}
          autoComplete="off"
        />

        {message.trim() && !isRecording ? (
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 rounded-full flex-shrink-0 bg-transparents hover:bg-white/20 dark:hover:bg-white/10 dark:text-white text-black shadow-md flex items-center justify-center transition-transform"
            disabled={isBlocked}
          >
            <SendHorizontal className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            className="h-10 w-10 rounded-full flex-shrink-0 bg-transparent hover:bg-white/20 dark:hover:bg-white/10 text-black dark:text-white flex items-center justify-center transition-colors"
            onMouseDown={startRecording}
            disabled={isBlocked || isRecording}
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </form>
  );
}
