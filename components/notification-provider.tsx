"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { useChatContext } from "./chat-context";
import { useFirebase } from "@/lib/firebase-provider";
import type { User } from "@/types/user";
import NotificationToast from "./notification-toast";

interface Props {
  currentUserId: string;
  contacts: User[];
  selectedContact: User | null;
}

export function NotificationProvider({
  currentUserId,
  contacts,
  selectedContact,
}: Props) {
  const { db } = useFirebase();
  //   const { selectedContact } = useChatContext();

  const [notifications, setNotifications] = useState<Record<string, number>>(
    {}
  );
  const [lastMessageIds, setLastMessageIds] = useState<Record<string, string>>(
    {}
  );
  const soundNotif = new Audio("/sound/notification.mp3");

  const contactMap = contacts.reduce((acc, contact) => {
    acc[contact.uid] = contact.displayName;
    return acc;
  }, {} as Record<string, string>);

  useEffect(() => {
    if (!db || !currentUserId || contacts.length === 0) return;

    const unsubscribes = contacts.map((contact) => {
      const chatId = [currentUserId, contact.uid].sort().join("_");

      const q = query(
        collection(db, "messages"),
        where("chatId", "==", chatId),
        orderBy("timestamp", "desc"),
        limit(1)
      );

      return onSnapshot(q, (snapshot) => {
        snapshot.forEach((doc) => {
          const msg = doc.data();

          const isFromContact = msg.senderId === contact.uid;
          const isToCurrentUser = msg.receiverId === currentUserId;
          const notSeen = !msg.isSeen;
          const notCurrentlyOpened = selectedContact?.uid !== contact.uid;

          if (
            isFromContact &&
            isToCurrentUser &&
            notSeen &&
            notCurrentlyOpened &&
            doc.id !== lastMessageIds[contact.uid]
          ) {
            setNotifications((prev) => ({
              ...prev,
              [contact.uid]: (prev[contact.uid] || 0) + 1,
            }));
            setLastMessageIds((prev) => ({
              ...prev,
              [contact.uid]: doc.id,
            }));
            soundNotif.play();
          }
        });
      });
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [contacts, db, currentUserId, selectedContact]);

  const clearNotification = (userId: string) => {
    setNotifications((prev) => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
  };

  return (
    <NotificationToast
      notifications={notifications}
      contactMap={contactMap}
      onClear={clearNotification}
    />
  );
}
