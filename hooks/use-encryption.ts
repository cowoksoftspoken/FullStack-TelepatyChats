"use client";

import { useFirebase } from "@/lib/firebase-provider";
import {
  decryptKey,
  decryptMessage,
  encryptedBuffer,
  encryptKey,
  encryptMessage,
  exportPrivateKey,
  exportPublicKey,
  generateKeyPair,
  generateMessageKey,
  importPrivateKey,
  importPublicKey,
} from "@/utils/encryption";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { get, set } from "idb-keyval";
import { useEffect, useState } from "react";

export function useEncryption(currentUser: any) {
  const { db } = useFirebase();
  const [publicKey, setPublicKey] = useState<Uint8Array | null>(null);
  const [privateKey, setPrivateKey] = useState<Uint8Array | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [contactPublicKeys, setContactPublicKeys] = useState<
    Record<string, Uint8Array>
  >({});

  useEffect(() => {
    if (!currentUser?.uid) return;

    const initializeEncryption = async () => {
      try {
        const localPrivateKey = await get(
          `encryption_private_key_${currentUser.uid}`
        );

        const userKeysDoc = await getDoc(doc(db, "userKeys", currentUser.uid));

        if (userKeysDoc.exists()) {
          const data = userKeysDoc.data();

          if (localPrivateKey) {
            const importedPrivateKey = await importPrivateKey(localPrivateKey);
            const importedPublicKey = await importPublicKey(data.publicKey);

            setPrivateKey(importedPrivateKey);
            setPublicKey(importedPublicKey);
          } else {
            const importedPublicKey = await importPublicKey(data.publicKey);
            setPublicKey(importedPublicKey);
            console.warn(
              "[Encryption] The private key was not found on this device. Please import it from your old device."
            );
          }
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
  ): Promise<Uint8Array | null> => {
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

      const { cipherText, iv } = await encryptMessage(message, messageKey);

      const encryptedKeyForContact = await encryptKey(
        messageKey,
        contactPublicKey
      );

      const encryptedKeyForSelf = await encryptKey(messageKey, publicKey);

      return {
        isEncrypted: true,
        encryptedText: cipherText,
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

      const messageKey = await decryptKey(keyToDecrypt, privateKey, publicKey!);

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

  const decryptLastMessageFromContact = async (
    lastMessage: string,
    encryptedKeyForSelf: string,
    encryptedKey: string,
    isSender: boolean,
    iv: string
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

      const messageKey = await decryptKey(keyToDecrypt, privateKey, publicKey!);
      const decryptedMessage = await decryptMessage(
        lastMessage,
        iv,
        messageKey
      );

      return decryptedMessage;
    } catch (error) {
      console.error("Error decrypting last message:", error);
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

      const encryptedBufferr = await encryptedBuffer(fileBuffer, messageKey);

      const encryptedBlob = new Blob(
        [encryptedBufferr.encryptedBuffer.slice(0)],
        {
          type: "application/octet-stream",
        }
      );

      const encryptedKeyForContact = await encryptKey(
        messageKey,
        contactPublicKey
      );

      const encryptedKeyForSelf = await encryptKey(messageKey, publicKey);

      return {
        encryptedFile: encryptedBlob,
        encryptedKey: encryptedKeyForContact,
        encryptedKeyForSelf: encryptedKeyForSelf,
        iv: encryptedBufferr.nonceBase64,
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

  return {
    isInitialized,
    encryptMessageForContact,
    decryptMessageFromContact,
    encryptFile,
    decryptLastMessageFromContact,
  };
}
