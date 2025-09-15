"use client";

import { useState, useEffect } from "react";
import { Phone, Video, Ban, Check } from "lucide-react";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  setDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "./user-avatar";
import { useFirebase } from "@/lib/firebase-provider";
import type { User } from "@/types/user";
import { useToast } from "@/components/ui/use-toast";
import useUserStatus from "@/hooks/use-user-status";

interface UserProfilePopupProps {
  user: User;
  currentUser: any;
  initiateCall: (isVideo: boolean) => void;
  onClose: () => void;
  open: boolean;
}

export function UserProfilePopup({
  user,
  currentUser,
  initiateCall,
  onClose,
  open,
}: UserProfilePopupProps) {
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isBlocking, setIsBlocking] = useState(false);
  const { isOnline, isBlocked, isUserBlockedByContact } = useUserStatus(
    user.uid,
    currentUser?.uid
  );
  const handleBlockUser = async () => {
    if (!currentUser || !user) return;

    setIsBlocking(true);

    try {
      const userRef = doc(db, "users", currentUser.uid);

      if (isBlocked) {
        await updateDoc(userRef, {
          blockedUsers: arrayRemove(user.uid),
        });
        toast({
          title: "User unblocked",
          description: `You have unblocked ${user.displayName}.`,
        });
      } else {
        await updateDoc(userRef, {
          blockedUsers: arrayUnion(user.uid),
        });
        toast({
          title: "User blocked",
          description: `You have blocked ${user.displayName}.`,
        });
      }
    } catch (error) {
      console.error("Error blocking/unblocking user:", error);
      toast({
        variant: "destructive",
        title: "Action failed",
        description: "Failed to update block status. Please try again.",
      });
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Info</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-4 space-y-4">
          <div className="w-24 h-24">
            <UserAvatar
              user={user}
              size="lg"
              isBlocked={isBlocked || isUserBlockedByContact}
            />
          </div>

          <div className="text-center">
            <h3 className="text-xl font-semibold flex items-center justify-center gap-1">
              {user.displayName}
              {user.isVerified && !user.isAdmin && (
                <span className="">
                  <svg
                    aria-label="Sudah Diverifikasi"
                    fill="rgb(0, 149, 246)"
                    height="14"
                    role="img"
                    viewBox="0 0 40 40"
                    width="14"
                  >
                    <title>Verified</title>
                    <path
                      d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                      fillRule="evenodd"
                    ></path>
                  </svg>
                </span>
              )}
              {user.isAdmin && !isBlocked && !isUserBlockedByContact && (
                <svg
                  aria-label="Afiliated Account"
                  height="16"
                  role="img"
                  viewBox="0 0 40 40"
                  width="16"
                  gradientUnits="userSpaceOnUse"
                >
                  <defs>
                    <linearGradient
                      id="metallicGold-affiliated-account"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stop-color="#fff7b0" />
                      <stop offset="25%" stop-color="#ffd700" />
                      <stop offset="50%" stop-color="#ffa500" />
                      <stop offset="75%" stop-color="#ffd700" />
                      <stop offset="100%" stop-color="#fff7b0" />
                    </linearGradient>
                  </defs>
                  <title>Afiliated Account</title>
                  <path
                    d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                    fill="url(#metallicGold-affiliated-account)"
                    fill-rule="evenodd"
                  ></path>
                </svg>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {isUserBlockedByContact && (
              <p className="text-xs text-red-500 mt-1">
                This user has blocked you
              </p>
            )}
          </div>

          <div className="flex gap-4 mt-4">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-12 w-12"
              onClick={() => {
                if (!isBlocked && !isUserBlockedByContact && isOnline) {
                  initiateCall(false);
                } else {
                  toast({
                    variant: "destructive",
                    title: "Cannot initiate call",
                    description:
                      "You cannot call this user because one of you has blocked the other or the user is offline.",
                  });
                }
              }}
              disabled={isBlocked || isUserBlockedByContact || !isOnline}
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-12 w-12"
              onClick={() => {
                if (!isBlocked && !isUserBlockedByContact && isOnline) {
                  initiateCall(true);
                } else {
                  toast({
                    variant: "destructive",
                    title: "Cannot initiate call",
                    description:
                      "You cannot call this user because one of you has blocked the other or the user is offline.",
                  });
                }
              }}
              disabled={isBlocked || isUserBlockedByContact || !isOnline}
            >
              <Video className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          {!isUserBlockedByContact && (
            <Button
              variant={isBlocked ? "outline" : "destructive"}
              className="w-full"
              onClick={handleBlockUser}
              disabled={isBlocking}
            >
              {isBlocking ? (
                "Processing..."
              ) : isBlocked ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Unblock User
                </>
              ) : (
                <>
                  <Ban className="mr-2 h-4 w-4" />
                  Block User
                </>
              )}
            </Button>
          )}

          {isUserBlockedByContact && (
            <p className="text-sm text-red-500 text-center w-full">
              You can’t block/unblock this user because they have already
              blocked you.
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
