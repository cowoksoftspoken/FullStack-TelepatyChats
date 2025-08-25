import { useFirebase } from "@/lib/firebase-provider";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

export default function useUserStatus(uid: string) {
  const { db } = useFirebase();
  const [isOnline, setIsOnline] = useState(false);
  const statusRef = useRef<boolean>(false);

  useEffect(() => {
    if (!uid) return;

    const docRef = doc(db, "users", uid);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const newStatus = !!data.online;

        if (statusRef.current !== newStatus) {
          statusRef.current = newStatus;
          setIsOnline(newStatus);
        }
      }
    });

    return () => unsubscribe();
  }, [uid, db]);

  return isOnline;
}
