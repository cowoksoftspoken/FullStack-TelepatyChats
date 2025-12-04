// This file has been deprecated. Please use hooks/use-media-decrypter.ts instead.
// The code below is kept for reference purposes only.
// If you need to refer to the old implementation, you can find it here:
// ---------------------------------------------------------------------------------------

"use client";

import { db } from "@/lib/firebase";
import {
  decryptedBuffer,
  decryptKey,
  importPrivateKey,
  importPublicKey,
} from "@/utils/encryption";
import { doc, getDoc } from "firebase/firestore";
import { get } from "idb-keyval";
import { useEffect, useState } from "react";

const globalDecryptedCache = new Map<string, string>();
const pendingDecryptions: Record<string, Promise<string>> = {};

export function useDecryptedMedia() {
  const [decryptedUrls, setDecryptedUrls] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    return () => {
      globalDecryptedCache.forEach((url) => URL.revokeObjectURL(url));
      globalDecryptedCache.clear();
    };
  }, []);

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
    if (!fileIsEncrypted) return fileURL;

    if (globalDecryptedCache.has(messageId))
      return globalDecryptedCache.get(messageId)!;

    if (decryptedUrls[messageId]) {
      const url = decryptedUrls[messageId];
      globalDecryptedCache.set(messageId, url);
      return url;
    }
    if (messageId in pendingDecryptions) return pendingDecryptions[messageId];

    const promise = (async () => {
      try {
        const res = await fetch(fileURL);
        const encryptedBlob = await res.blob();
        const buffer = await encryptedBlob.arrayBuffer();

        const keyData = isSender ? fileEncryptedKeyForSelf : fileEncryptedKey;
        const privKeyString = await get(
          `encryption_private_key_${currentUserId}`
        );
        const privateKey = await importPrivateKey(privKeyString);

        const userDoc = await getDoc(doc(db, "userKeys", currentUserId));
        const publicKey = await importPublicKey(userDoc.data()!.publicKey);

        const messageKey = await decryptKey(keyData, privateKey, publicKey);
        const decryptedBuf = await decryptedBuffer(buffer, messageKey, fileIv);
        const uint8 = new Uint8Array(decryptedBuf);

        const blobUrl = URL.createObjectURL(
          new Blob([uint8], { type: fileType || "application/octet-stream" })
        );

        globalDecryptedCache.set(messageId, blobUrl);
        setDecryptedUrls((prev) => ({ ...prev, [messageId]: blobUrl }));

        return blobUrl;
      } catch {
        return fileURL;
      } finally {
        delete pendingDecryptions[messageId];
      }
    })();

    pendingDecryptions[messageId] = promise;
    return promise;
  };

  return { decryptedUrls, decryptAndCreateBlobUrl };
}
