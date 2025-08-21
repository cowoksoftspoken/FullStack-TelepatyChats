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
}: {
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
}) {
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
              className="h-10 w-10 rounded-full"
              disabled={isBlocked}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => imageInputRef?.current?.click()}>
              <ImageIcon className="mr-2 h-4 w-4" />
              <span>Image</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => videoInputRef?.current?.click()}>
              <Film className="mr-2 h-4 w-4" />
              <span>Video</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => audioInputRef?.current?.click()}>
              <Music className="mr-2 h-4 w-4" />
              <span>Audio</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef?.current?.click()}>
              <File className="mr-2 h-4 w-4" />
              <span>File</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleShareLocation}
              disabled={isGettingLocation}
            >
              <MapPin className="mr-2 h-5 w-5" />
              <span>
                {isGettingLocation ? "Getting location..." : "Location"}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsCameraDialogOpen(true)}>
              <Camera className="mr-2 h-4 w-4" />
              <span>Camera</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* file inputs */}
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

        {/* Emoji */}
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

        {/* Text input */}
        <Input
          value={message}
          onInput={handleInput}
          placeholder={
            isBlocked ? "You cannot send messages to this user" : "Message..."
          }
          className="flex-1 rounded-full dark:bg-[#000000]/30"
          disabled={isBlocked}
        />

        {message.trim() ? (
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
            disabled={isBlocked}
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </form>
  );
}
