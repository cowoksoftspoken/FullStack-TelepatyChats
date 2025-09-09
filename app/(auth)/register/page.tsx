"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { useFirebase } from "@/lib/firebase-provider";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const { auth, db, currentUser, loading } = useFirebase();

  useEffect(() => {
    if (!loading && currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, loading, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreed) {
      setError("You must agree to the terms and conditions.");
      return;
    }

    if (name.length < 3 || name.length > 12) {
      setError(
        "Name must be at least 3 characters long and up to 12 characters long."
      );
      return;
    }

    if (!email) {
      setError("Email is required");
      return;
    }

    if (password.length < 6 || password.length > 12) {
      setError(
        "Password must be at least 6-12 characters and contain capital letters, numbers, and special characters."
      );
      return;
    }

    if (loading || !auth || !db) {
      setError("Authentication service is initializing. Please try again.");
      return;
    }

    setFormLoading(true);
    setError("");

    try {
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
        setError("Email already in use");
      } else if (err.code === "auth/weak-password") {
        setError(
          "Password must be at least 6-12 characters and contain capital letters, numbers, and special characters."
        );
      } else {
        setError("Failed to create account");
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
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Preparing registration...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            Create an account
          </CardTitle>
          <CardDescription>
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm font-medium text-red-500">{error}</div>
            )}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                placeholder="Example"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={3}
                maxLength={12}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="flex items-center relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute right-10 mx-4 text-muted-foreground hover:text-primary"
                  onClick={() => {
                    const newPass = generatePassword();
                    setPassword(newPass);
                  }}
                  title="Generate password"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="absolute right-6 mx-2 text-muted-foreground hover:text-primary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(password);
                  }}
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="absolute right-2 text-muted-foreground hover:text-primary"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.03-10-9s4.477-9 10-9c1.32 0 2.58.26 3.75.725M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3l18 18M10.586 10.586A2 2 0 0112 12a2 2 0 01-1.414 1.414M15.472 15.472A8.936 8.936 0 0112 18c-4.418 0-8-3.582-8-8 0-1.657.507-3.195 1.378-4.472M9.88 9.88a3 3 0 014.243 4.243"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-4 w-4"
                required
              />
              <label htmlFor="agree" className="text-sm">
                I agree to the{" "}
                <Link
                  href="/terms-and-conditions"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy-policy"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full disabled:bg-muted-foreground"
              disabled={formLoading || !agreed}
            >
              {formLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Register
            </Button>
            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
        <div className="text-balance text-sm px-4 pb-4 text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary text-center">
          By clicking continue, you agree to our{" "}
          <a href="/terms-and-conditions" className="text-xs">
            Terms of Conditions
          </a>{" "}
          and{" "}
          <a href="/privacy-policy" className="text-xs">
            Privacy Policy
          </a>
          .
        </div>
      </Card>
    </div>
  );
}
