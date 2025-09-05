"use client";

import { useState, useEffect, useRef } from "react";
import {
  base64ToArrayBuffer,
  decryptKey,
  importPrivateKey,
} from "@/utils/encryption";
import { get } from "idb-keyval";

export function useDecryptedMedia() {
  const [decryptedUrls, setDecryptedUrls] = useState<Record<string, string>>(
    {}
  );
  const pendingDecryptions = useRef<Record<string, Promise<string>>>({});

  useEffect(() => {
    return () => {
      Object.values(decryptedUrls).forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [decryptedUrls]);

  const decryptAndCreateBlobUrl = async (
    messageId: string,
    fileURL: string,
    fileIsEncrypted: boolean,
    fileEncryptedKey: string,
    fileEncryptedKeyForSelf: string,
    fileIv: string,
    fileType: string,
    isSender: boolean,
    currentUserId: string
  ): Promise<string> => {
    if (!fileIsEncrypted) {
      return fileURL;
    }

    if (decryptedUrls[messageId] && decryptedUrls[messageId] === fileURL) {
      return decryptedUrls[messageId];
    }

    if (
      Object.prototype.hasOwnProperty.call(
        pendingDecryptions.current,
        messageId
      )
    ) {
      return pendingDecryptions.current[messageId];
    }

    const decryptionPromise = (async () => {
      try {
        const response = await fetch(fileURL);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch file: ${response.status} ${response.statusText}`
          );
        }

        const encryptedBlob = await response.blob();

        const keyData = isSender ? fileEncryptedKeyForSelf : fileEncryptedKey;
        const iv = fileIv;

        if (!keyData || !iv) {
          console.error("Missing encryption data for media");
          return fileURL;
        }

        const privKeyString =
          typeof window !== "undefined"
            ? await get(`encryption_private_key_${currentUserId}`)
            : null;
        if (!privKeyString) {
          console.error("Private key not found in localStorage");
          return fileURL;
        }

        const privateKey = await importPrivateKey(privKeyString);

        const messageKey = await decryptKey(keyData, privateKey);

        const ivArrayBuffer = base64ToArrayBuffer(iv);

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

        const blobUrl = URL.createObjectURL(decryptedBlob);

        setDecryptedUrls((prev) => ({ ...prev, [messageId]: blobUrl }));

        return blobUrl;
      } catch (error) {
        console.error("Error decrypting media:", error);
        return fileURL;
      } finally {
        if (
          Object.prototype.hasOwnProperty.call(
            pendingDecryptions.current,
            messageId
          )
        ) {
          delete pendingDecryptions.current[messageId];
        }
      }
    })();

    pendingDecryptions.current[messageId] = decryptionPromise;
    return decryptionPromise;
  };

  return {
    decryptedUrls,
    decryptAndCreateBlobUrl,
  };
}
