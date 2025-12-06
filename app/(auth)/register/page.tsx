"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Copy,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  UserPlus,
  Mail,
  Lock,
  User,
} from "lucide-react";
import { useFirebase } from "@/lib/firebase-provider";
import {
  useGoogleReCaptcha,
  GoogleReCaptchaProvider,
} from "react-google-recaptcha-v3";

function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lastAttemptTime, setLastAttemptTime] = useState<number>(0);

  const { executeRecaptcha } = useGoogleReCaptcha();
  const router = useRouter();
  const { auth, db, currentUser, loading } = useFirebase();
  const RATE_LIMIT_COOLDOWN = 30 * 1000;

  useEffect(() => {
    if (!loading && currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, loading, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const now = Date.now();
    if (now - lastAttemptTime < RATE_LIMIT_COOLDOWN) {
      const remaining = Math.ceil(
        (RATE_LIMIT_COOLDOWN - (now - lastAttemptTime)) / 1000
      );
      setError(`Too many failed attempts. Please wait ${remaining} seconds.`);
      return;
    }

    if (
      !email.includes("@gmail.com") &&
      !email.includes("@yahoo.com") &&
      !email.includes("@icloud.com") &&
      !email.includes("@outlook.com") &&
      !email.includes("@hotmail.com")
    ) {
      setError("Please enter a valid email address.");
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
      setError("Invalid email format.");
      return;
    }

    if (!executeRecaptcha) {
      setError("Recaptcha not ready yet.");
      return;
    }

    if (!agreed) {
      setError("You must agree to the Terms & Conditions and Privacy Policy.");
      return;
    }

    if (name.length < 3 || name.length > 12) {
      setError("Display name must be between 3 and 12 characters.");
      return;
    }

    if (!email) {
      setError("Email is required.");
      return;
    }

    if (password.length < 6 || password.length > 12) {
      setError(
        "Password must be 6-12 characters long and contain uppercase letters, numbers, and special characters."
      );
      return;
    }

    if (loading || !auth || !db) {
      setError("Authentication service is still loading. Please try again.");
      return;
    }

    setFormLoading(true);
    setError("");
    setLastAttemptTime(Date.now());

    try {
      const token = await executeRecaptcha("register_submit");
      const verifyResponse = await fetch("/api/verify-recaptcha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      const verifyData = await verifyResponse.json();

      // if (verifyData) {
      //   console.log("reCAPTCHA verification response:", verifyData);
      //   return; // Debugging line to check the response
      // }

      if (!verifyData.success || verifyData.score < 0.5) {
        setError("reCAPTCHA verification failed. Please try again.");
        setFormLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: name,
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: name,
        email: email,
        photoURL: null,
        createdAt: new Date().toISOString(),
        online: true,
      });

      router.push("/dashboard");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (err.code === "auth/weak-password") {
        setError(
          "Password must be 6-12 characters long and contain uppercase letters, numbers, and special characters."
        );
      } else {
        setError("Failed to create account. Please try again.");
      }
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const generatePassword = (length = 12) => {
    const alphabet =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return password;
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg font-medium text-foreground">
            Preparing registration...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg">
              <UserPlus className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
              Create Your Account
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect instantly with friends and communities
            </p>
          </div>

          <Card className="border-0 bg-card backdrop-blur-sm shadow-2xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-center text-xl font-semibold text-foreground">
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-foreground"
                  >
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Enter display name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      minLength={3}
                      maxLength={12}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-foreground"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pl-10 pr-24"
                    />
                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          const newPass = generatePassword();
                          setPassword(newPass);
                        }}
                        className="rounded p-1 text-muted-foreground hover:text-primary transition-colors"
                        title="Generate password"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(password);
                        }}
                        className="rounded p-1 text-muted-foreground hover:text-primary transition-colors"
                        title="Copy password"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="rounded p-1 text-muted-foreground hover:text-primary transition-colors"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="agree"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    required
                  />
                  <label
                    htmlFor="agree"
                    className="text-sm text-muted-foreground"
                  >
                    I agree to the{" "}
                    <Link
                      href="/terms-and-conditions"
                      className="text-primary hover:underline"
                    >
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy-policy"
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={formLoading || !agreed}
                  className="w-full"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Sign Up
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="font-medium text-primary hover:underline"
                    >
                      Sign In
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
      scriptProps={{
        async: false,
        defer: false,
        appendTo: "head",
        nonce: undefined,
      }}
    >
      <div className="min-h-screen bg-background flex">
        <RegisterForm />

        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center lg:bg-primary">
          <div className="max-w-md text-center text-primary-foreground">
            <div className="mb-8">
              <img
                src="/images/register-illustration.jpg"
                alt="Register Illustration"
                className="mx-auto h-64 w-64 rounded-full object-cover shadow-2xl"
              />
            </div>
            <h3 className="text-2xl font-bold mb-4">Join the Conversation</h3>
            <p className="text-lg opacity-90">
              Start chatting instantly with friends, family, and communities in
              real-time.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold">10K+</div>
                <div className="opacity-90">Active Users</div>
              </div>
              <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold">99%</div>
                <div className="opacity-90">User Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GoogleReCaptchaProvider>
  );
}
