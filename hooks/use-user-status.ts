import { useFirebase } from "@/lib/firebase-provider";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

export default function useUserStatus(uid: string, currentUserUid?: string) {
  const { db } = useFirebase();
  const [isOnline, setIsOnline] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isUserBlockedByContact, setIsUserBlockedByContact] = useState(false);
  const statusRef = useRef<boolean>(false);

  useEffect(() => {
    if (!uid || !currentUserUid) return;

    const currentUserRef = doc(db, "users", currentUserUid);
    const unsubCurrent = onSnapshot(currentUserRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsBlocked(data.blockedUsers?.includes(uid) || false);
      }
    });

    const targetUserRef = doc(db, "users", uid);
    const unsubTarget = onSnapshot(targetUserRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsUserBlockedByContact(
          data.blockedUsers?.includes(currentUserUid) || false
        );

        const newStatus = !!data.online;
        if (statusRef.current !== newStatus) {
          statusRef.current = newStatus;
          setIsOnline(newStatus);
        }
      }
    });

    return () => {
      unsubCurrent();
      unsubTarget();
    };
  }, [uid, currentUserUid, db]);

  return { isOnline, isBlocked, isUserBlockedByContact };
}
