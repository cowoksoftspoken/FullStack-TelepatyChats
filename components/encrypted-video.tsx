"use client";

import { useEffect, useState, useRef } from "react";
import { Lock } from "lucide-react";
import { useDecryptedMedia } from "@/hooks/use-decrypted-media";
import VideoPlayer from "./video-message";
import { useToast } from "@/hooks/use-toast";

interface EncryptedVideoProps {
  messageId: string;
  fileURL: string;
  fileIsEncrypted: boolean;
  fileEncryptedKey: string;
  fileEncryptedKeyForSelf: string;
  fileIv: string;
  fileType: string;
  isSender: boolean;
  currentUserId: string;
}

export function EncryptedVideo({
  messageId,
  fileURL,
  fileIsEncrypted,
  fileEncryptedKey,
  fileEncryptedKeyForSelf,
  fileIv,
  fileType,
  isSender,
  currentUserId,
}: EncryptedVideoProps) {
  const { decryptedUrls, decryptAndCreateBlobUrl } = useDecryptedMedia();
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const { toast } = useToast();
  const hasAttemptedDecryption = useRef(false);

  useEffect(() => {
    const decryptVideo = async () => {
      if (!fileIsEncrypted || hasAttemptedDecryption.current) return;

      hasAttemptedDecryption.current = true;

      try {
        console.log(`Decrypting video for message ${messageId}`);
        const url = await decryptAndCreateBlobUrl(
          messageId,
          fileURL,
          fileIsEncrypted,
          fileEncryptedKey,
          fileEncryptedKeyForSelf,
          fileIv,
          fileType || "video/mp4",
          isSender,
          currentUserId
        );

        console.log(`Setting video URL to ${url}`);
        setVideoUrl(url);
      } catch (err) {
        console.error("Error in decryptVideo:", err);
        setError("Failed to decrypt video");
        toast({
          variant: "destructive",
          title: "Decryption Error",
          description: "Failed to decrypt video. Please try again.",
        });
      }
    };

    if (!fileIsEncrypted) {
      setVideoUrl(fileURL);
    } else {
      const cachedUrl = decryptedUrls[messageId];
      if (cachedUrl) {
        setVideoUrl(cachedUrl);
      } else {
        decryptVideo();
      }
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
    toast,
  ]);

  return (
    <div className="relative">
      {videoUrl && <VideoPlayer fileURL={videoUrl} />}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md">
          <div className="bg-red-500 text-white px-2 py-1 rounded text-xs">
            {error}
          </div>
        </div>
      )}

      {fileIsEncrypted && videoUrl && (
        <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
          <Lock className="h-3 w-3 text-green-500" />
        </div>
      )}
    </div>
  );
}
