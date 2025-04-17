"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const oobCode = searchParams.get("oobCode");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // if (!oobCode) {
    //   setError("Invalid Link");
    //   setLoading(false);
    //   return;
    if (!auth) {
      setError("Authentication service is initializing. Please try again.");
      setLoading(false);
      return;
    }

    verifyPasswordResetCode(auth, oobCode!)
      .then((email) => {
        setEmail(email);
        setLoading(false);
      })
      .catch(() => {
        setError("Reset link is invalid or has expired");
        setLoading(false);
      });
  }, [oobCode]);

  const handleReset = async () => {
    setError("");
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The password is not the same");
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode!, newPassword);
      setSuccess(
        "Password has been reset successfully, you will be redirected to login page."
      );
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err.message || "Failed reset password.");
    }
  };

  if (loading) return <p className="text-center mt-10">Loading..</p>;

  if (!oobCode)
    return (
      <p className="text-center mt-10 text-red-500 font-bold text-xl">
        Invalid Link
      </p>
    );

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            {error ? (
              <span className="text-red-500">{error}</span>
            ) : (
              `Reset password for ${email}`
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <p className="text-green-500 text-sm mb-4">{success}</p>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <span
                      className="absolute right-3 top-2.5 cursor-pointer text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <span
                      className="absolute right-3 top-2.5 cursor-pointer text-muted-foreground"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </span>
                  </div>
                </div>

                <Button className="w-full" onClick={handleReset}>
                  Reset Password
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
