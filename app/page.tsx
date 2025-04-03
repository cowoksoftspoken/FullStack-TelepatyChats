"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/lib/firebase-provider";

export default function Home() {
  const { currentUser, loading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    // Only redirect after Firebase has initialized and auth state is determined
    if (!loading) {
      if (currentUser) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [currentUser, loading, router]);

  // Show loading state while determining auth state
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Checking authentication...</span>
      </div>
    );
  }

  // This will briefly show before the redirect happens
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-2">Redirecting...</span>
    </div>
  );
}
