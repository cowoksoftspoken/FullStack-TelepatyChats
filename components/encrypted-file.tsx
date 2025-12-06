"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import {
  decryptedBuffer,
  decryptKey,
  importPrivateKey,
  importPublicKey,
} from "@/utils/encryption";
import { doc, getDoc } from "firebase/firestore";
import { get } from "idb-keyval";
import { FileText } from "lucide-react";
import { useState } from "react";

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

        const privKeyString = await get(
          `encryption_private_key_${currentUserId}`
        );

        if (!privKeyString) {
          throw new Error("Private key not found in localStorage");
        }

        const privateKey = await importPrivateKey(privKeyString);
        const userDocKeys = await getDoc(doc(db, "userKeys", currentUserId));
        if (!userDocKeys.exists()) {
          console.error("Public key not found in Firestore");
          return fileURL;
        }
        const importedPublicKey = await importPublicKey(
          userDocKeys?.data()?.publicKey
        );
        const messageKey = await decryptKey(
          keyData,
          privateKey,
          importedPublicKey
        );

        const encryptedBuffer = await encryptedBlob.arrayBuffer();
        const decryptedBuffered = await decryptedBuffer(
          encryptedBuffer,
          messageKey,
          fileIv
        );

        const decryptedBlob = new Blob([decryptedBuffered.slice(0)], {
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
        downloadLink.download = messageId || "downloaded_file";
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
    <div
      className="flex items-center gap-3 rounded-xl p-3 
  bg-neutral-100/70 dark:bg-neutral-800/40 
  backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 
  shadow-sm transition"
    >
      <div className="p-2 rounded-lg bg-white dark:bg-neutral-700 shadow-sm">
        <FileText className="h-5 w-5 text-neutral-700 dark:text-neutral-200" />
      </div>

      <div className="flex-1 overflow-hidden">
        <div
          className="text-blue-600 dark:text-blue-400 text-sm font-medium truncate cursor-pointer hover:underline"
          data-type={fileType}
        >
          {fileName || "File"}
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {(fileSize ?? 0) < 1024 * 1024
            ? `${((fileSize ?? 0) / 1024).toFixed(2)} KB`
            : `${((fileSize ?? 0) / (1024 * 1024)).toFixed(2)} MB`}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
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
