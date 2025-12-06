"use client";

import type { Message } from "@/types/message";
import { Globe, MapPin } from "lucide-react";
import { useMemo } from "react";
import { MarkdownCollapsedText } from "./markdown-collapsed-text";
import { EncryptedAudio } from "./encrypted-audio";
import { EncryptedFile } from "./encrypted-file";
import { EncryptedImage } from "./encrypted-image";
import { EncryptedVideo } from "./encrypted-video";
import MapPreview from "./map-preview";
import { YoutubeEmbed } from "./yt-embed";
import { LocationMessage } from "./location-message";

interface MessageContentProps {
  msg: Message;
  messageText: string;
  currentUserId: string;
  theme: string;
  onImageClick?: (url: string) => void;
  // setDecryptedImageCache?: React.Dispatch<
  //   React.SetStateAction<Record<string, string>>
  // >;
  decryptedLocation?: { lat: number; lng: number } | undefined;
}

export function MessageContent({
  msg,
  messageText,
  currentUserId,
  theme,
  onImageClick,
  decryptedLocation,
}: // setDecryptedImageCache,
MessageContentProps) {
  const youtubeId = useMemo(() => {
    if (msg.type === "text") {
      const regex =
        /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = messageText.match(regex);
      return match ? match[1] : null;
    }
    return null;
  }, [msg.type, messageText]);

  // const processedText = useMemo(() => {
  //   if (msg.type === "text") {
  //     const urlPattern =
  //       /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;
  //     const youtubeRegex =
  //       /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

  //     if (urlPattern.test(messageText)) {
  //       return messageText.replace(urlPattern, (url) => {
  //         if (youtubeRegex.test(url)) {
  //           return `<a href="${url}" class="text-indigo-500 underline max-w-full" target="_blank" rel="noopener noreferrer" role="button">YouTube</a>`;
  //         } else {
  //           return `<a href="${url}" class="text-indigo-500 underline max-w-full" target="_blank" rel="noopener noreferrer" role="button">${url}</a>`;
  //         }
  //       });
  //     }
  //   }
  //   return messageText;
  // }, [msg.type, messageText]);

  const handleImageClick = () => {
    if (onImageClick) {
      onImageClick(msg.id);
    }
  };

  switch (msg.type) {
    case "image":
      return (
        <div className="mt-1">
          <EncryptedImage
            messageId={msg.id}
            fileURL={msg.fileURL || ""}
            fileName={msg.fileName}
            fileIsEncrypted={msg.fileIsEncrypted || false}
            fileEncryptedKey={msg.fileEncryptedKey || ""}
            fileEncryptedKeyForSelf={msg.fileEncryptedKeyForSelf || ""}
            fileIv={msg.fileIv || ""}
            fileType={msg.fileType || "image/jpeg"}
            isSender={msg.senderId === currentUserId}
            currentUserId={currentUserId}
            onClick={handleImageClick}
            // onReady={(blobURL) => {
            //   setDecryptedImageCache?.((prev) => {
            //     if (prev[msg.id] === blobURL) return prev;
            //     return {
            //       ...prev,
            //       [msg.id]: blobURL,
            //     };
            //   });
            // }}
          />
          {messageText !== msg.fileName && (
            <div className="mt-1 text-sm flex items-center gap-1">
              <p>{messageText}</p>
            </div>
          )}
        </div>
      );

    case "video":
      return (
        <div className="mt-1 w-full">
          <EncryptedVideo
            messageId={msg.id}
            fileURL={msg.fileURL || ""}
            fileIsEncrypted={msg.fileIsEncrypted || false}
            fileEncryptedKey={msg.fileEncryptedKey || ""}
            fileEncryptedKeyForSelf={msg.fileEncryptedKeyForSelf || ""}
            fileIv={msg.fileIv || ""}
            fileType={msg.fileType || "video/mp4"}
            isSender={msg.senderId === currentUserId}
            currentUserId={currentUserId}
          />
          {messageText !== msg.fileName && (
            <div className="mt-1 text-sm flex items-center gap-1">
              <p>{messageText}</p>
            </div>
          )}
        </div>
      );

    case "location":
      const finalLocationPriority = msg.isEncrypted
        ? decryptedLocation
        : msg.location;

      if (!finalLocationPriority) {
        return (
          <div className="mt-1 w-full p-2 bg-muted rounded-xl border border-dashed flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs text-muted-foreground">
              Decrypting location...
            </span>
          </div>
        );
      }

      return (
        <LocationMessage
          msg={msg}
          finalLocationPriority={finalLocationPriority}
          messageText={messageText}
        />
      );

    case "audio":
      return (
        <div className="mt-1 w-full">
          <EncryptedAudio
            messageId={msg.id}
            fileURL={msg.fileURL || ""}
            duration={msg.duration}
            fileName={msg.fileName}
            fileIsEncrypted={msg.fileIsEncrypted || false}
            fileEncryptedKey={msg.fileEncryptedKey || ""}
            fileEncryptedKeyForSelf={msg.fileEncryptedKeyForSelf || ""}
            fileIv={msg.fileIv || ""}
            fileType={msg.fileType || "audio/webm"}
            isSender={msg.senderId === currentUserId}
            currentUserId={currentUserId}
            isDark={theme === "dark" ? false : true}
          />
          {messageText !== "Audio message" && messageText !== msg.fileName && (
            <div className="mt-1 text-sm w-full flex items-center gap-1">
              <p>{messageText}</p>
            </div>
          )}
        </div>
      );

    case "file":
      return (
        <div className="mt-1 block gap-2">
          <EncryptedFile
            messageId={msg.id}
            fileURL={msg.fileURL || ""}
            fileName={msg.fileName}
            fileSize={msg.size}
            fileType={msg.fileType}
            fileIsEncrypted={msg.fileIsEncrypted || false}
            fileEncryptedKey={msg.fileEncryptedKey || ""}
            fileEncryptedKeyForSelf={msg.fileEncryptedKeyForSelf || ""}
            fileIv={msg.fileIv || ""}
            isSender={msg.senderId === currentUserId}
            currentUserId={currentUserId}
          />
          {messageText !== msg.fileName && (
            <div className="mt-2 text-base flex items-center gap-1">
              <p>{messageText}</p>
            </div>
          )}
        </div>
      );

    default:
      return (
        <>
          {youtubeId && <YoutubeEmbed videoId={youtubeId} />}
          <div className="w-full mt-1">
            <MarkdownCollapsedText text={messageText} />
          </div>
        </>
      );
  }
}
