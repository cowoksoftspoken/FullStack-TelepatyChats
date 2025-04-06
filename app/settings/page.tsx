"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  deleteUser,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  DocumentData,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Moon,
  ArrowLeft,
  LogOut,
  Trash2,
  Camera,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  KeyRound,
  CircleUser,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useFirebase } from "@/lib/firebase-provider";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserAvatar } from "@/components/user-avatar";
import { VerificationRequest } from "@/components/admin/verification-request";

export default function SettingsPage() {
  const {
    currentUser,
    db,
    auth,
    storage,
    loading: authLoading,
  } = useFirebase();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameUpdateLoading, setNameUpdateLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resetPasswordSent, setResetPasswordSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [userData, setUserData] = useState<DocumentData | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login");
    } else if (currentUser) {
      setDisplayName(currentUser.displayName || "");
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    const checkUser = async () => {
      const userSnapShot = await getDoc(doc(db, "users", currentUser.uid));
      if (userSnapShot.exists()) {
        setUserData(userSnapShot.data());
      }
    };

    checkUser();
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    setDeleteLoading(true);
    setDeleteError("");

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Delete user data from Firestore
      await deleteDoc(doc(db, "users", currentUser.uid));

      // Delete user account
      await deleteUser(currentUser);

      // Redirect to login
      router.push("/login");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error.code === "auth/wrong-password") {
        setDeleteError("Incorrect password");
      } else {
        setDeleteError("Failed to delete account. Please try again.");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setAvatarUploading(true);

    try {
      // Upload to Firebase Storage
      const storageRef = ref(
        storage,
        `avatars/${currentUser.uid}/${Date.now()}_${file.name}`
      );
      await uploadBytes(storageRef, file);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update user profile
      await updateProfile(currentUser, {
        photoURL: downloadURL,
      });

      // Update user document in Firestore
      await updateDoc(doc(db, "users", currentUser.uid), {
        photoURL: downloadURL,
      });

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to update your profile picture. Please try again.",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    } finally {
      setAvatarUploading(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUpdateName = async () => {
    if (!currentUser || !displayName.trim()) return;

    setNameUpdateLoading(true);

    try {
      // Update user profile
      await updateProfile(currentUser, {
        displayName: displayName,
      });

      // Update user document in Firestore
      await updateDoc(doc(db, "users", currentUser.uid), {
        displayName: displayName,
      });

      setIsEditingName(false);
      toast({
        title: "Name updated",
        description: "Your display name has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating name:", error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update your display name. Please try again.",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    } finally {
      setNameUpdateLoading(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!currentUser) return;

    try {
      await sendEmailVerification(currentUser);
      setVerificationSent(true);
      toast({
        title: "Verification email sent",
        description:
          "Please check your inbox and follow the instructions to verify your email.",
      });
    } catch (error) {
      console.error("Error sending verification email:", error);
      toast({
        variant: "destructive",
        title: "Failed to send verification email",
        description: "Please try again later.",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    }
  };

  const handleRequestPasswordReset = async () => {
    if (!currentUser || !currentUser.email) return;

    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setResetPasswordSent(true);
      toast({
        title: "Password reset email sent",
        description:
          "Please check your inbox and follow the instructions to reset your password.",
      });
    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast({
        variant: "destructive",
        title: "Failed to send password reset email",
        description: "Please try again later.",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    }
  };

  if (authLoading || !currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard"
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Chat
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your profile information</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative group">
                <UserAvatar
                  user={currentUser}
                  className="h-24 w-24 cursor-pointer"
                  showHoverCard={false}
                  size="lg"
                  showEnlargeOnClick={true}
                />
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={handleAvatarClick}
                >
                  {avatarUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  ) : (
                    <Camera className="h-8 w-8 text-white" />
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Click to change your profile picture
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="name">Display Name</Label>
                {!isEditingName ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingName(true)}
                  >
                    Edit
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingName(false);
                      setDisplayName(currentUser?.displayName || "");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {isEditingName ? (
                <div className="flex gap-2">
                  <Input
                    id="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                  <Button
                    onClick={handleUpdateName}
                    disabled={nameUpdateLoading}
                  >
                    {nameUpdateLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              ) : (
                <Input
                  id="name"
                  value={currentUser?.displayName || ""}
                  disabled
                />
              )}
            </div>

            {/* Email with verification status */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                Email
                {currentUser.emailVerified ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="email"
                  value={currentUser?.email || ""}
                  disabled
                  className="flex-1"
                />
                {!currentUser.emailVerified && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendVerificationEmail}
                    disabled={verificationSent}
                  >
                    {verificationSent ? "Sent" : "Verify"}
                  </Button>
                )}
              </div>
            </div>

            {/* Email verification alert */}
            {!currentUser.emailVerified && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Email not verified</AlertTitle>
                <AlertDescription>
                  Please verify your email address to access all features.
                  {!verificationSent && (
                    <Button
                      variant="link"
                      className="p-0 h-auto text-destructive underline"
                      onClick={handleSendVerificationEmail}
                    >
                      Send verification email
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Password reset button */}
            <div className="space-y-2">
              <Label>Password</Label>
              <div>
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleRequestPasswordReset}
                  disabled={!currentUser.emailVerified || resetPasswordSent}
                >
                  <KeyRound className="h-4 w-4" />
                  {resetPasswordSent
                    ? "Password Reset Email Sent"
                    : "Request Password Change"}
                </Button>
                {!currentUser.emailVerified && (
                  <p className="text-xs text-muted-foreground mt-1">
                    You need to verify your email before changing your password.
                  </p>
                )}
              </div>
            </div>
            {!userData?.isVerified && userData?.emailVerified && (
              <VerificationRequest />
            )}
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full flex items-center justify-center"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Account</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove your data from our servers.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Confirm your password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {deleteError && (
                    <div className="text-sm font-medium text-destructive">
                      {deleteError}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={!password || deleteLoading}
                  >
                    {deleteLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Delete Account
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>

        {userData?.isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Controls</CardTitle>
              <CardDescription>
                Access admin features and controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                You have administrator privileges. Use the admin dashboard to
                manage users, verification requests, and send broadcast
                messages.
              </p>
              <Link href="/admin">
                <Button className="w-full">
                  <span className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
                      <path d="M12 8v8"></path>
                      <path d="M12 16l4-4"></path>
                      <path d="M12 16l-4-4"></path>
                    </svg>
                    <span>Access Admin Dashboard</span>
                  </span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the appearance of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Moon className="h-4 w-4" />
                <Label htmlFor="dark-mode">Dark Mode</Label>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === "dark"}
                onCheckedChange={(checked) =>
                  setTheme(checked ? "dark" : "light")
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
