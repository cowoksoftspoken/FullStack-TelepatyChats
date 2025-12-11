"use client";

import { useEffect, useState } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { useFirebase } from "@/lib/firebase-provider";

export function useFCM(currentUser: any) {
  const { db, app } = useFirebase();
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      currentUser
    ) {
      const messaging = getMessaging(app);

      const requestPermission = async () => {
        try {
          const permission = await Notification.requestPermission();

          if (permission === "granted") {
            const registration = await navigator.serviceWorker.register(
              "/firebase-messaging-sw.js"
            );

            await navigator.serviceWorker.ready;

            const token = await getToken(messaging, {
              vapidKey:
                "BPuy4FB4qbFJ4-cL26QHW8i8edudHwJz2ZXpEs2j6ON3BNleDYIiaGpz6PHne2i1QB5wSkEkX2Kf7FWjpkh1xAI",
              serviceWorkerRegistration: registration,
            });

            if (token) {
              setFcmToken(token);

              await updateDoc(doc(db, "users", currentUser.uid), {
                fcmTokens: arrayUnion(token),
                lastActive: new Date().toISOString(),
              });
            }
          } else {
            console.log("Notification permission denied");
          }
        } catch (error) {
          console.error("Error setting up FCM:", error);
        }
      };

      requestPermission();

      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("Foreground Message:", payload);
        // toast({ title: payload.notification.title, description: payload.notification.body })
        new Audio("/notification_sound.mp3").play().catch(() => {});
      });

      return () => unsubscribe();
    }
  }, [currentUser, db, app]);

  return fcmToken;
}
