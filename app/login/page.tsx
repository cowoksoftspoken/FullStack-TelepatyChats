"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

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
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/lib/firebase-provider";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { auth, currentUser, loading } = useFirebase();

  useEffect(() => {
    // Only redirect if Firebase has initialized and user is logged in
    if (!loading && currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Don't proceed if Firebase is still initializing
    if (loading || !auth) {
      setError("Authentication service is initializing. Please try again.");
      return;
    }

    setFormLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed login attempts. Please try again later.");
      } else {
        setError("Failed to login. Please try again.");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleLoginWithProvider = async (providerName: "google" | "github") => {
    if (!auth) return;

    let provider: AuthProvider | null = null;
    if (providerName === "google") {
      provider = new GoogleAuthProvider();
    } else if (providerName === "github") {
      provider = new GithubAuthProvider();
    }

    if (!provider) {
      setError("Invalid authentication provider.");
      return;
    }

    setFormLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, provider);
      const userRef = doc(db, "users", result.user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || "",
          photoURL: result.user.photoURL || "",
          provider: providerName,
          createdAt: serverTimestamp(),
        });
      }

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setFormLoading(false);
      setError("Failed to sign in with provider");
    } finally {
      setFormLoading(false);
    }
  };

  // Show loading state while Firebase initializes
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Preparing login...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm font-medium text-destructive">
                {error}
              </div>
            )}
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
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={formLoading}>
              {formLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sign In
            </Button>
            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:underline"
              >
                Register
              </Link>
            </div>
          </CardFooter>
        </form>
        <div className="my-6 flex items-center px-6">
          <hr className="flex-grow border-t border-gray-300 dark:border-gray-700" />
          <span className="mx-4 text-sm text-muted-foreground">OR</span>
          <hr className="flex-grow border-t border-gray-300 dark:border-gray-700" />
        </div>

        {/* Social Login Buttons */}
        <div className="flex flex-col gap-3 px-6 pb-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleLoginWithProvider("google")}
          >
            <img
              src="/assets/Google_logo.svg"
              alt="Google"
              className="mr-2 h-5 w-5"
            />
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleLoginWithProvider("github")}
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6a3.1 3.1 0 00-1.3-1.7c-1-.6.1-.6.1-.6a2.4 2.4 0 011.7 1.2 2.4 2.4 0 003.2 1 2.4 2.4 0 01.7-1.5c-2.6-.3-5.3-1.3-5.3-5.8a4.6 4.6 0 011.2-3.2 4.2 4.2 0 01.1-3.1s1-.3 3.3 1.2a11.3 11.3 0 016 0c2.3-1.5 3.3-1.2 3.3-1.2a4.2 4.2 0 01.1 3.1 4.6 4.6 0 011.2 3.2c0 4.5-2.7 5.5-5.3 5.8a2.7 2.7 0 01.8 2.1v3.1c0 .3.2.7.8.6A12 12 0 0012 0z" />
            </svg>
            Continue with GitHub
          </Button>
        </div>
      </Card>
    </div>
  );
}
