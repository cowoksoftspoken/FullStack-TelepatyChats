"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useFirebase } from "@/lib/firebase-provider";
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPublicKey,
  importPrivateKey,
  generateMessageKey,
  encryptMessage,
  decryptMessage,
  encryptKey,
  decryptKey,
} from "@/utils/encryption";
import { set, get } from "idb-keyval";

export function useEncryption(currentUser: any) {
  const { db } = useFirebase();
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [contactPublicKeys, setContactPublicKeys] = useState<
    Record<string, CryptoKey>
  >({});

  useEffect(() => {
    if (!currentUser?.uid) return;

    const initializeEncryption = async () => {
      try {
        const localPrivateKey = await get(
          `encryption_private_key_${currentUser.uid}`
        );

        const userKeysDoc = await getDoc(doc(db, "userKeys", currentUser.uid));

        if (userKeysDoc.exists() && localPrivateKey) {
          const data = userKeysDoc.data();
          const importedPrivateKey = await importPrivateKey(localPrivateKey);
          const importedPublicKey = await importPublicKey(data.publicKey);

          setPrivateKey(importedPrivateKey);
          setPublicKey(importedPublicKey);
        } else {
          const keyPair = await generateKeyPair();
          const exportedPublicKey = await exportPublicKey(keyPair.publicKey);
          const exportedPrivateKey = await exportPrivateKey(keyPair.privateKey);

          await setDoc(doc(db, "userKeys", currentUser.uid), {
            publicKey: exportedPublicKey,
            createdAt: new Date().toISOString(),
          });

          await set(
            `encryption_private_key_${currentUser.uid}`,
            exportedPrivateKey
          );

          setPrivateKey(keyPair.privateKey);
          setPublicKey(keyPair.publicKey);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing encryption:", error);
      }
    };

    initializeEncryption();
  }, [currentUser, db]);

  const fetchContactPublicKey = async (
    contactId: string
  ): Promise<CryptoKey | null> => {
    if (contactPublicKeys[contactId]) {
      return contactPublicKeys[contactId];
    }

    try {
      const contactKeysDoc = await getDoc(doc(db, "userKeys", contactId));

      if (contactKeysDoc.exists()) {
        const data = contactKeysDoc.data();
        const importedPublicKey = await importPublicKey(data.publicKey);

        setContactPublicKeys((prev) => ({
          ...prev,
          [contactId]: importedPublicKey,
        }));

        return importedPublicKey;
      }

      return null;
    } catch (error) {
      console.error("Error fetching contact public key:", error);
      return null;
    }
  };

  const encryptMessageForContact = async (
    message: string,
    contactId: string
  ) => {
    if (!isInitialized || !publicKey) {
      throw new Error("Encryption not initialized");
    }

    try {
      const contactPublicKey = await fetchContactPublicKey(contactId);

      if (!contactPublicKey) {
        throw new Error("Contact public key not found");
      }

      const messageKey = await generateMessageKey();

      const { ciphertext, iv } = await encryptMessage(message, messageKey);

      const encryptedKeyForContact = await encryptKey(
        messageKey,
        contactPublicKey
      );

      const encryptedKeyForSelf = await encryptKey(messageKey, publicKey);

      return {
        isEncrypted: true,
        encryptedText: ciphertext,
        encryptedKeyForContact,
        encryptedKeyForSelf,
        iv,
      };
    } catch (error) {
      console.error("Error encrypting message:", error);
      return {
        isEncrypted: false,
        text: message,
      };
    }
  };

  const decryptMessageFromContact = async (
    encryptedText: string,
    encryptedKey: string,
    encryptedKeyForSelf: string | undefined,
    iv: string,
    isSender: boolean
  ) => {
    if (!isInitialized || !privateKey) {
      throw new Error(
        "Encryption not initialized or private key not available"
      );
    }

    try {
      const keyToDecrypt = isSender
        ? encryptedKeyForSelf || encryptedKey
        : encryptedKey;

      const messageKey = await decryptKey(keyToDecrypt, privateKey);

      const decryptedMessage = await decryptMessage(
        encryptedText,
        iv,
        messageKey
      );

      return decryptedMessage;
    } catch (error) {
      console.error("Error decrypting message:", error);
      return "Locked Message 🔒";
    }
  };

  const encryptFile = async (
    file: File,
    contactId: string
  ): Promise<{
    encryptedFile: Blob;
    encryptedKey: string;
    encryptedKeyForSelf: string;
    iv: string;
    isEncrypted: boolean;
  }> => {
    if (!isInitialized || !publicKey) {
      return {
        encryptedFile: file,
        encryptedKey: "",
        encryptedKeyForSelf: "",
        iv: "",
        isEncrypted: false,
      };
    }

    try {
      const contactPublicKey = await fetchContactPublicKey(contactId);

      if (!contactPublicKey) {
        throw new Error("Contact public key not found");
      }

      const fileBuffer = await file.arrayBuffer();

      const messageKey = await generateMessageKey();

      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const ivString = arrayBufferToBase64(iv.buffer);

      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
        },
        messageKey,
        fileBuffer
      );

      const encryptedBlob = new Blob([encryptedBuffer], {
        type: "application/octet-stream",
      });

      const encryptedKeyForContact = await encryptKey(
        messageKey,
        contactPublicKey
      );

      const encryptedKeyForSelf = await encryptKey(messageKey, publicKey);

      return {
        encryptedFile: encryptedBlob,
        encryptedKey: encryptedKeyForContact,
        encryptedKeyForSelf: encryptedKeyForSelf,
        iv: ivString,
        isEncrypted: true,
      };
    } catch (error) {
      console.error("Error encrypting file:", error);
      return {
        encryptedFile: file,
        encryptedKey: "",
        encryptedKeyForSelf: "",
        iv: "",
        isEncrypted: false,
      };
    }
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  return {
    isInitialized,
    encryptMessageForContact,
    decryptMessageFromContact,
    encryptFile,
  };
}
