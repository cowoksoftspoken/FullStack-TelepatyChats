// useMediaDecrypter.ts
"use client";

import { get } from "idb-keyval";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  decryptedBuffer,
  decryptKey,
  importPrivateKey,
  importPublicKey,
} from "@/utils/encryption";

const MediaDecrypterSingleton = {
  decrypted: new Map<string, string>(),
  pending: new Map<string, Promise<string>>(),
};

(window as any).MediaDecrypter = MediaDecrypterSingleton;

export function useMediaDecrypter() {
  const decryptMedia = async ({
    messageId,
    fileURL,
    fileIsEncrypted,
    fileEncryptedKey,
    fileEncryptedKeyForSelf,
    fileIv,
    fileType,
    isSender,
    currentUserId,
  }: {
    messageId: string;
    fileURL: string;
    fileIsEncrypted: boolean;
    fileEncryptedKey: string;
    fileEncryptedKeyForSelf: string;
    fileIv: string;
    fileType: string;
    isSender: boolean;
    currentUserId: string;
  }) => {
    if (!fileIsEncrypted) return fileURL;

    if (MediaDecrypterSingleton.decrypted.has(messageId)) {
      return MediaDecrypterSingleton.decrypted.get(messageId)!;
    }

    if (MediaDecrypterSingleton.pending.has(messageId)) {
      return MediaDecrypterSingleton.pending.get(messageId)!;
    }

    const job = (async () => {
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

        const blobUrl = URL.createObjectURL(
          new Blob([new Uint8Array(decryptedBuf)], {
            type: fileType || "application/octet-stream",
          })
        );

        MediaDecrypterSingleton.decrypted.set(messageId, blobUrl);
        return blobUrl;
      } finally {
        MediaDecrypterSingleton.pending.delete(messageId);
      }
    })();

    MediaDecrypterSingleton.pending.set(messageId, job);
    return job;
  };

  return { decrypt: decryptMedia };
}
