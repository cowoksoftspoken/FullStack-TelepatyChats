"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const oobCode = searchParams.get("oobCode");

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );

  useEffect(() => {
    if (!oobCode) {
      setStatus("error");
      return;
    }

    applyActionCode(auth, oobCode)
      .then(() => {
        setStatus("success");
        setTimeout(() => router.push("/dashboard"), 2000);
      })
      .catch(() => {
        setStatus("error");
      });
  }, [oobCode, router]);

  const renderContent = () => {
    switch (status) {
      case "verifying":
        return (
          <>
            <Loader2 className="animate-spin w-6 h-6 mx-auto mb-4 text-muted-foreground" />
            <p className="text-center text-sm text-muted-foreground">
              Verifying your email...
            </p>
          </>
        );
      case "success":
        return (
          <>
            <CheckCircle2 className="w-6 h-6 mx-auto mb-4 text-green-500" />
            <p className="text-center text-green-600 font-medium">
              Your email has been verified! 🎉
            </p>
            <p className="text-center text-sm text-muted-foreground mt-1">
              Redirecting you to dashboard...
            </p>
          </>
        );
      case "error":
        return (
          <>
            <XCircle className="w-6 h-6 mx-auto mb-4 text-red-500" />
            <p className="text-center text-red-600 font-medium">
              Invalid or expired verification link
            </p>
            <p className="text-center text-sm text-muted-foreground mt-1">
              Try requesting a new verification email.
            </p>
          </>
        );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-center">
            We’re confirming your account
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6">{renderContent()}</CardContent>
      </Card>
    </div>
  );
}
