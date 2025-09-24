"use client";

import { useState, useEffect, useRef, SyntheticEvent } from "react";
import { Lock } from "lucide-react";
import { useDecryptedMedia } from "@/hooks/use-decrypted-media";
import { useToast } from "@/hooks/use-toast";

interface EncryptedImageProps {
  messageId: string;
  fileURL: string;
  fileName?: string;
  fileIsEncrypted: boolean;
  fileEncryptedKey: string;
  fileEncryptedKeyForSelf: string;
  fileIv: string;
  fileType: string;
  isSender: boolean;
  currentUserId: string;
  onClick?: () => void;
  onReady?: (decryptedUrl: string) => void;
}

export function EncryptedImage({
  messageId,
  fileURL,
  fileName,
  fileIsEncrypted,
  fileEncryptedKey,
  fileEncryptedKeyForSelf,
  fileIv,
  fileType,
  isSender,
  currentUserId,
  onClick,
  onReady,
}: EncryptedImageProps) {
  const { decryptedUrls, decryptAndCreateBlobUrl } = useDecryptedMedia();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  const { toast } = useToast();
  const hasAttemptedDecryption = useRef(false);

  useEffect(() => {
    const decryptImage = async () => {
      if (!fileIsEncrypted || hasAttemptedDecryption.current) return;

      hasAttemptedDecryption.current = true;
      setIsLoading(true);

      try {
        const url = await decryptAndCreateBlobUrl(
          messageId,
          fileURL,
          fileIsEncrypted,
          fileEncryptedKey,
          fileEncryptedKeyForSelf,
          fileIv,
          fileType || "image/jpeg",
          isSender,
          currentUserId
        );

        setImageUrl(url);
        onReady?.(url);
        setIsLoading(false);
      } catch (err) {
        console.error("Error in decryptImage:", err);
        setError("Failed to decrypt image");
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Decryption Error",
          description: "Failed to decrypt image. Please try again.",
        });
      }
    };

    if (!fileIsEncrypted) {
      setImageUrl(fileURL || "/placeholder.svg");
      onReady?.(fileURL || "/placeholder.svg");
      setIsLoading(false);
    } else {
      const cachedUrl = decryptedUrls[messageId];
      if (cachedUrl) {
        setImageUrl(cachedUrl);
        setIsLoading(false);
      } else {
        decryptImage();
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

  const handleClick = () => {
    if (isLoading) return;
    if (error) {
      toast({
        variant: "destructive",
        title: "Image Error",
        description: "Cannot open image due to an error.",
      });
      return;
    }
    if (onClick && !isLoading && !error) {
      onClick();
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    setError("Failed to load image");
    console.error("Image failed to load:", imageUrl);
    e.currentTarget.src = "/placeholder.svg";
  };

  return (
    <div className="relative">
      <img
        src={imageUrl || "/placeholder.svg"}
        alt={fileName ? btoa(fileName) : "Image"}
        className="w-full rounded-md max-h-60 object-cover cursor-pointer"
        onClick={handleClick}
        onLoad={handleImageLoad}
        datatype={fileType}
        onError={handleImageError}
      />
      {isLoading && (
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
