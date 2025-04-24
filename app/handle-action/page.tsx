"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function HandleActionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");

    if (!mode || !oobCode) {
      router.push("/");
      return;
    }

    switch (mode) {
      case "resetPassword":
        router.push(
          `/reset-password?oobCode=${oobCode}&mode=${mode}&requestDate=${Date.now().toLocaleString()}`
        );
        break;
      case "verifyEmail":
        router.push(
          `/verify-email?oobCode=${oobCode}&mode=${mode}&requestDate=${Date.now().toLocaleString()}`
        );
        break;
    }
  }, [searchParams, router]);

  return <p className="text-center mt-10">Redirecting...</p>;
}
