"use client";

import type React from "react";

import { doc, setDoc, updateDoc } from "firebase/firestore";
import { useFirebase } from "@/lib/firebase-provider";
import { useTheme } from "@/components/theme-provider";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import {
  Paperclip,
  Smile,
  ImageIcon,
  Film,
  Music,
  File,
  MapPin,
  Camera,
  Mic,
  Send,
  Lock,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useEffect, useRef, useState } from "react";
import type { User } from "@/types/user";

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
  isRecording,
}: MessageInputProps) {
  const { db } = useFirebase();
  const { theme } = useTheme();
  const isTypingRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stopTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [message, setMessage] = useState("");

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
        sendMessage(message);
        setMessage("");
      }}
      className="border-t p-4 px-2 md:px-4 dark:bg-[#151516]"
    >
      <div className="flex gap-2 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              disabled={isBlocked}
            >
              <Paperclip className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-52 rounded-xl p-2 
          bg-white dark:bg-neutral-900 
          shadow-lg border border-gray-100 dark:border-neutral-800 
          animate-in slide-in-from-top-2 fade-in-80
        "
          >
            <DropdownMenuItem
              className="flex items-center gap-3 px-3 py-2 rounded-lg 
            hover:bg-green-50 dark:hover:bg-green-900/30 
            transition-colors cursor-pointer
          "
              onClick={() => imageInputRef?.current?.click()}
            >
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/40">
                <ImageIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Image
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex items-center gap-3 px-3 py-2 rounded-lg 
            hover:bg-blue-50 dark:hover:bg-blue-900/30 
            transition-colors cursor-pointer
          "
              onClick={() => videoInputRef?.current?.click()}
            >
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/40">
                <Film className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Video
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex items-center gap-3 px-3 py-2 rounded-lg 
            hover:bg-purple-50 dark:hover:bg-purple-900/30 
            transition-colors cursor-pointer
          "
              onClick={() => audioInputRef?.current?.click()}
            >
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/40">
                <Music className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Audio
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex items-center gap-3 px-3 py-2 rounded-lg 
            hover:bg-yellow-50 dark:hover:bg-yellow-900/30 
            transition-colors cursor-pointer
          "
              onClick={() => fileInputRef?.current?.click()}
            >
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/40">
                <File className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                File
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={isGettingLocation}
              className="flex items-center gap-3 px-3 py-2 rounded-lg 
            hover:bg-red-50 dark:hover:bg-red-900/30 
            transition-colors cursor-pointer disabled:opacity-50
          "
              onClick={handleShareLocation}
            >
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/40">
                <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {isGettingLocation ? "Getting location..." : "Location"}
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex items-center gap-3 px-3 py-2 rounded-lg 
            hover:bg-pink-50 dark:hover:bg-pink-900/30 
            transition-colors cursor-pointer
          "
              onClick={() => setIsCameraDialogOpen(true)}
            >
              <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/40">
                <Camera className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Camera
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded-full"
              disabled={isBlocked}
            >
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
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
          placeholder={
            isBlocked ? "You cannot send messages to this user" : "Message..."
          }
          className="flex-1 rounded-full dark:bg-[#000000]/30"
          disabled={isBlocked}
        />

        {message.trim() && !isRecording ? (
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 rounded-full"
            disabled={isBlocked}
          >
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            className="h-10 w-10 rounded-full"
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
