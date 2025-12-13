"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { useFirebase } from "@/lib/firebase-provider";
import { doc, getDoc, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";

export default function AdminPage() {
  const { currentUser, loading } = useFirebase();
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const router = useRouter();

  const auth = getAuth();

  const user = auth.currentUser;
  if (!user) return;

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push("/login");
      return;
    }

    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userSnapshot = await getDoc(userDocRef);

          if (userSnapshot.exists()) {
            setUserData(userSnapshot.data());
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
        } finally {
          setDataLoading(false);
        }
      }
    };

    fetchUserData();
  }, [currentUser, loading, router]);

  if (loading || dataLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userData?.isAdmin) {
    router.push("/dashboard");
    return null;
  }

  return <AdminDashboard userData={userData} />;
}
