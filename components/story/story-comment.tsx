"use client";

import { useState, useRef, useEffect } from "react";
import { useFirebase } from "@/lib/firebase-provider";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Send, Smile, Loader2, SendHorizontal } from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useEncryption } from "@/hooks/use-encryption";

interface StoryReplyProps {
  storyId: string;
  storyOwnerId: string;
  currentUser: any;
  storyUrl?: string;
  mediaType?: "image" | "video" | "text";
  onFocus: () => void;
  onBlur: () => void;
}

export function StoryReply({
  storyId,
  storyOwnerId,
  currentUser,
  storyUrl,
  mediaType,
  onFocus,
  onBlur,
}: StoryReplyProps) {
  const { db } = useFirebase();
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { encryptMessageForContact, isInitialized } =
    useEncryption(currentUser);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [text]);

  const handleSend = async () => {
    if (!text.trim() || !currentUser || isSending) return;

    if (currentUser.uid === storyOwnerId) return;

    setIsSending(true);

    try {
      const chatId = [currentUser.uid, storyOwnerId].sort().join("_");

      let messageData: any = {
        chatId,
        senderId: currentUser.uid,
        receiverId: storyOwnerId,
        timestamp: new Date().toISOString(),
        isSeen: false,
        type: "text",
        replyContext: {
          type: "story",
          storyId: storyId,
          storyUrl: storyUrl || null,
          mediaType: mediaType || "image",
        },
      };

      if (isInitialized) {
        const encryptedData = await encryptMessageForContact(
          text,
          storyOwnerId
        );

        if (encryptedData.isEncrypted) {
          messageData = {
            ...messageData,
            isEncrypted: true,
            encryptedText: encryptedData.encryptedText,
            encryptedKey: encryptedData.encryptedKeyForContact,
            encryptedKeyForSelf: encryptedData.encryptedKeyForSelf,
            iv: encryptedData.iv,
            text: "桃 Replied to a story",
          };
        } else {
          messageData.text = text;
          messageData.isEncrypted = false;
        }
      } else {
        messageData.text = text;
        messageData.isEncrypted = false;
      }

      await addDoc(collection(db, "messages"), messageData);
      await updateDoc(doc(db, "typingStatus", chatId), {
        [currentUser.uid]: false,
      }).catch(() => {});

      setText("");
      setShowEmoji(false);
      onBlur();
    } catch (error) {
      console.error("Failed to send reply:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setText((prev) => prev + emoji.native);
  };

  return (
    <div className="w-full flex flex-col items-center gap-2 relative">
      {showEmoji && (
        <div className="absolute bottom-16 z-50 animate-in slide-in-from-bottom-5 origin-bottom-left left-1/2 -translate-x-[66%] max-w-[95vw] overflow-hidden md:left-0 md:translate-x-0 md:max-w-none md:overflow-visible">
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme="dark"
            previewPosition="none"
            navPosition="bottom"
            perLine={8}
          />
        </div>
      )}

      <div className="flex w-full items-end gap-2">
        <div className="flex-1 flex items-end gap-1 bg-black/40 backdrop-blur-md border border-white/20 rounded-[24px] px-2 py-1.5 focus-within:border-white/50 focus-within:bg-black/60 transition-colors">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 rounded-full text-white/80 hover:text-white hover:bg-white/10 mb-0.5"
            onClick={() => {
              setShowEmoji(!showEmoji);
              onFocus();
            }}
          >
            <Smile className="h-5 w-5" />
          </Button>

          <textarea
            ref={textareaRef}
            placeholder={
              isInitialized ? "Reply to story..." : "Initializing..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={onFocus}
            onBlur={() => {
              setTimeout(() => {
                if (!showEmoji) onBlur();
              }, 200);
            }}
            rows={1}
            disabled={!isInitialized || isSending}
            className="flex-1 text-sm bg-transparent text-white placeholder:text-white/50 focus:outline-none resize-none py-1.5 min-h-[24px] max-h-[120px] leading-relaxed scrollbar-hide"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>

        <Button
          size="icon"
          className={`h-11 w-11 shrink-0 rounded-full transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90`}
          onClick={handleSend}
          disabled={!text.trim() || isSending}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <SendHorizontal className="h-5 w-5 ml-0.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
