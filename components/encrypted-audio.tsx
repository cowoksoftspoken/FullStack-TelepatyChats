"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useDecryptedMedia } from "@/hooks/use-decrypted-media";
import { AudioMessage } from "./audio-message";

interface EncryptedAudioProps {
  messageId: string;
  fileURL: string;
  duration?: number;
  fileName?: string;
  fileIsEncrypted: boolean;
  fileEncryptedKey: string;
  fileEncryptedKeyForSelf: string;
  fileIv: string;
  fileType: string;
  isSender: boolean;
  currentUserId: string;
  isDark?: boolean;
}

export function EncryptedAudio({
  messageId,
  fileURL,
  duration,
  fileName,
  fileIsEncrypted,
  fileEncryptedKey,
  fileEncryptedKeyForSelf,
  fileIv,
  fileType,
  isSender,
  currentUserId,
  isDark = false,
}: EncryptedAudioProps) {
  const { decryptedUrls, decryptAndCreateBlobUrl } = useDecryptedMedia();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const decryptAudio = async () => {
      if (!fileIsEncrypted) return;

      try {
        await decryptAndCreateBlobUrl(
          messageId,
          fileURL,
          fileIsEncrypted,
          fileEncryptedKey,
          fileEncryptedKeyForSelf,
          fileIv,
          fileType || "audio/webm",
          isSender,
          currentUserId
        );
      } catch (err) {
        if (isMounted) {
          setError("Failed to decrypt audio");
          console.error("Error decrypting audio:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    decryptAudio();

    return () => {
      isMounted = false;
    };
  }, [
    messageId,
    fileURL,
    fileIsEncrypted,
    fileEncryptedKey,
    fileEncryptedKeyForSelf,
    fileIv,
    fileType,
    isSender,
    currentUserId,
    decryptAndCreateBlobUrl,
  ]);

  const audioUrl = fileIsEncrypted
    ? decryptedUrls[messageId] || ""
    : fileURL || "";

  return (
    <div className="relative">
      <AudioMessage
        src={audioUrl}
        duration={duration}
        fileName={fileName}
        isDark={isDark}
        className="w-full"
      />

      {isLoading && fileIsEncrypted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md">
          <div className="h-6 w-6 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md">
          <div className="bg-red-500 text-white px-2 py-1 rounded text-xs">
            {error}
          </div>
        </div>
      )}

      {fileIsEncrypted && (
        <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
          <Lock className="h-3 w-3 text-green-500" />
        </div>
      )}
    </div>
  );
}
