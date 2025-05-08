"use client";

import { useState } from "react";
import { FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  base64ToArrayBuffer,
  decryptKey,
  importPrivateKey,
} from "@/utils/encryption";

interface EncryptedFileProps {
  messageId: string;
  fileURL: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileIsEncrypted: boolean;
  fileEncryptedKey: string;
  fileEncryptedKeyForSelf: string;
  fileIv: string;
  isSender: boolean;
  currentUserId: string;
}

export function EncryptedFile({
  messageId,
  fileURL,
  fileName,
  fileSize,
  fileType,
  fileIsEncrypted,
  fileEncryptedKey,
  fileEncryptedKeyForSelf,
  fileIv,
  isSender,
  currentUserId,
}: EncryptedFileProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);

    toast({
      title: "Preparing download...",
      description: fileIsEncrypted
        ? "Decrypting file before download"
        : "Preparing file for download",
    });

    try {
      if (fileIsEncrypted) {
        const encryptedBlob = await fetch(fileURL).then((response) =>
          response.blob()
        );

        const keyData = isSender ? fileEncryptedKeyForSelf : fileEncryptedKey;
        const iv = fileIv;

        if (!keyData || !iv) {
          throw new Error("Missing encryption data");
        }

        const ivArrayBuffer = base64ToArrayBuffer(iv);

        const privKeyString = localStorage.getItem(
          `encryption_private_key_${currentUserId}`
        );

        if (!privKeyString) {
          throw new Error("Private key not found in localStorage");
        }

        const privateKey = await importPrivateKey(privKeyString);
        const messageKey = await decryptKey(keyData, privateKey);

        const encryptedBuffer = await encryptedBlob.arrayBuffer();
        const decryptedBuffer = await window.crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: new Uint8Array(ivArrayBuffer),
          },
          messageKey,
          encryptedBuffer
        );

        const decryptedBlob = new Blob([decryptedBuffer], {
          type: fileType || "application/octet-stream",
        });

        const url = URL.createObjectURL(decryptedBlob);
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = fileName || "downloaded_file";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        setTimeout(() => URL.revokeObjectURL(url), 100);

        toast({
          title: "Download ready",
          description: "File has been decrypted and downloaded",
          variant: "default",
        });
      } else {
        const downloadLink = document.createElement("a");
        downloadLink.href = fileURL;
        downloadLink.download = fileName || "downloaded_file";
        downloadLink.target = "_blank";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        toast({
          title: "Download ready",
          description: "File has been downloaded",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Download failed",
        description: `Could not download the file: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-muted rounded-md p-2 relative">
      <FileText className="h-5 w-5" />
      <div className="block flex-1">
        <div
          className="text-blue-500 text-sm hover:underline"
          data-type={fileType}
        >
          {fileName || "File"}
        </div>
        <p className="text-xs text-muted-foreground">
          {(fileSize ?? 0) < 1024 * 1024
            ? `${((fileSize ?? 0) / 1024).toFixed(2)} KB`
            : `${((fileSize ?? 0) / (1024 * 1024)).toFixed(2)} MB`}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-full"
        onClick={handleDownload}
        disabled={isDownloading}
        title="Download file"
      >
        {isDownloading ? (
          <div className="h-4 w-4 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-500"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        )}
      </Button>
    </div>
  );
}
