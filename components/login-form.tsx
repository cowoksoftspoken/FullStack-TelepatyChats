"use client";

import type React from "react";

import {
  type AuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { auth, db } from "@/lib/firebase";
import { Brain, Loader2 } from "lucide-react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useFirebase } from "@/lib/firebase-provider";

const MAX_RETRIES = 5;
const LOCKOUT_TIME_MS = 5 * 60 * 1000;

export function LoginForm() {
  const [email, setEmail] = useState("");
  const { currentUser, loading } = useFirebase();
  const [password, setPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    const storedRetries = Number.parseInt(
      localStorage.getItem("login_retries") || "0",
      10
    );
    const storedLockedUntil = Number.parseInt(
      localStorage.getItem("login_locked_until") || "0",
      10
    );

    setRetryCount(storedRetries);
    if (storedLockedUntil && storedLockedUntil > Date.now()) {
      setLockedUntil(storedLockedUntil);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.includes("@gmail.com") || !email.includes("@yahoo.com")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (lockedUntil && lockedUntil > Date.now()) {
      const secondsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(
        `Too many failed attempts. Try again in ${secondsLeft} seconds.`
      );
      return;
    }

    if (password.length < 6 || password.length > 12) {
      setError("Password must be between 6-12 characters.");
      return;
    }

    setFormLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);

      localStorage.removeItem("login_retries");
      localStorage.removeItem("login_locked_until");
      setRetryCount(0);
      setLockedUntil(null);

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);

      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      localStorage.setItem("login_retries", newRetryCount.toString());

      if (newRetryCount >= MAX_RETRIES) {
        const lockUntil = Date.now() + LOCKOUT_TIME_MS;
        setLockedUntil(lockUntil);
        localStorage.setItem("login_locked_until", lockUntil.toString());
        setError("Too many failed attempts. Please try again later.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many login attempts. Please try again later.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleLoginWithProvider = async (providerName: "google" | "github") => {
    if (lockedUntil && lockedUntil > Date.now()) {
      const secondsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(
        `Too many failed attempts. Try again in ${secondsLeft} seconds.`
      );
      return;
    }

    let provider: AuthProvider | null = null;
    if (providerName === "google") provider = new GoogleAuthProvider();
    if (providerName === "github") provider = new GithubAuthProvider();

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
      localStorage.removeItem("login_retries");
      localStorage.removeItem("login_locked_until");
      setRetryCount(0);
      setLockedUntil(null);

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in with provider.");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto backdrop-blur-sm bg-card/95 border-border/50 shadow-2xl">
      <CardContent className="space-y-6 p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Brain className="w-4 h-4 rounded-white/60" />
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        {error && (
          <div className="text-center text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <div className="input-glow">
              <Input
                id="email"
                type="email"
                placeholder="Email Address"
                className="h-12 transition-all duration-200 focus:scale-[1.02]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={formLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="input-glow">
              <Input
                id="password"
                type="password"
                placeholder="Password"
                className="h-12 transition-all duration-200 focus:scale-[1.02]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={formLoading}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={formLoading}
            className="w-full h-12 gradient-primary hover:opacity-90 transition-all duration-200 dark:text-white dark:hover:text-black text-black hover:text-white font-medium shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {formLoading ? "Processing..." : "Sign In"}
          </Button>
        </form>

        <div className="flex items-center space-x-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground font-medium">
            OR SIGN IN WITH
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 transition-all duration-200 hover:bg-accent hover:scale-[1.02] border-border/50 bg-transparent"
            onClick={() => handleLoginWithProvider("google")}
            disabled={formLoading}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>
          <Button
            variant="outline"
            className="h-12 transition-all duration-200 hover:bg-accent hover:scale-[1.02] border-border/50 bg-transparent"
            onClick={() => handleLoginWithProvider("github")}
            disabled={formLoading}
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6a3.1 3.1 0 00-1.3-1.7c-1-.6.1-.6.1-.6a2.4 2.4 0 011.7 1.2 2.4 2.4 0 003.2 1 2.4 2.4 0 01.7-1.5c-2.6-.3-5.3-1.3-5.3-5.8a4.6 4.6 0 011.2-3.2 4.2 4.2 0 01.1-3.1s1-.3 3.3 1.2a11.3 11.3 0 016 0c2.3-1.5 3.3-1.2 3.3-1.2a4.2 4.2 0 01.1 3.1 4.6 4.6 0 011.2 3.2c0 4.5-2.7 5.5-5.3 5.8a2.7 2.7 0 01.8 2.1v3.1c0 .3.2.7.8.6A12 12 0 0012 0z" />
            </svg>
            GitHub
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="text-primary hover:underline font-medium transition-colors"
          >
            Sign up now
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
