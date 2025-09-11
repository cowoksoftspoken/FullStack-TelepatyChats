"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  const [isLoading, setIsLoading] = useState(fileIsEncrypted);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const hasInitialized = useRef(false);
  const isDecrypting = useRef(false);

  const initializeAudio = useCallback(async () => {
    if (hasInitialized.current || isDecrypting.current) return;

    if (!fileIsEncrypted) {
      setAudioUrl(fileURL);
      setIsLoading(false);
      hasInitialized.current = true;
      return;
    }

    // cek jika sudah di decrypt
    const cachedUrl = decryptedUrls[messageId];
    if (cachedUrl) {
      setAudioUrl(cachedUrl);
      setIsLoading(false);
      hasInitialized.current = true;
      return;
    }

    isDecrypting.current = true;
    setIsLoading(true);

    try {
      const url = await decryptAndCreateBlobUrl(
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
      setAudioUrl(url);
      setError(null);
    } catch (err) {
      console.error("Error decrypting audio:", err);
      setError("Failed to decrypt audio");
      setAudioUrl(fileURL);
    } finally {
      setIsLoading(false);
      isDecrypting.current = false;
      hasInitialized.current = true;
    }
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
    decryptedUrls,
  ]);

  useEffect(() => {
    initializeAudio();
  }, [initializeAudio]);

  if (isLoading || !audioUrl) {
    return (
      <div className="relative">
        <div className="flex items-center justify-center p-4 bg-muted rounded-md min-h-[80px]">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-t-transparent border-primary rounded-full animate-spin"></div>
            <span className="text-sm text-muted-foreground">
              {isLoading ? "Decrypting audio..." : "Loading audio..."}
            </span>
          </div>
        </div>
        {fileIsEncrypted && (
          <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
            <Lock className="h-3 w-3 text-green-500" />
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative">
        <div className="flex items-center justify-center p-4 bg-red-100 dark:bg-red-900/20 rounded-md min-h-[80px]">
          <div className="text-center">
            <div className="text-red-600 dark:text-red-400 text-sm font-medium">
              Audio Error
            </div>
            <div className="text-red-500 dark:text-red-300 text-xs">
              {error}
            </div>
          </div>
        </div>
        {fileIsEncrypted && (
          <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
            <Lock className="h-3 w-3 text-red-500" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <AudioMessage
        src={audioUrl}
        duration={duration}
        fileName={fileName}
        isDark={isDark}
        messageId={messageId}
        className="w-full"
      />
    </div>
  );
}
