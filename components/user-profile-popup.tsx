"use client";

import { useState, useEffect } from "react";
import { Phone, Video, Ban, Check } from "lucide-react";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
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
  const [isBlocked, setIsBlocked] = useState(false);
  const [isUserBlockedByContact, setIsUserBlockedByContact] = useState(false);

  // Check if user is blocked when dialog opens
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!currentUser || !user) return;

      try {
        // Check if current user has blocked this user
        const [userDoc, contactDoc] = await Promise.all([
          getDoc(doc(db, "users", currentUser.uid)),
          getDoc(doc(db, "users", user.uid)),
        ]);

        // const userDoc = await getDoc(doc(db, "users", currentUser.uid))

        // // Check if this user has blocked current user
        // const contactDoc = await getDoc(doc(db, "users", user.uid))

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsBlocked(userData.blockedUsers?.includes(user.uid) || false);
        }

        if (contactDoc.exists()) {
          const contactData = contactDoc.data();
          setIsUserBlockedByContact(
            contactData.blockedUsers?.includes(currentUser.uid) || false
          );
        }
      } catch (error) {
        console.error("Error checking block status:", error);
      }
    };

    if (open) {
      checkBlockStatus();
    }
  }, [open, currentUser, user, db]);

  const handleBlockUser = async () => {
    if (!currentUser || !user) return;

    setIsBlocking(true);

    try {
      const userRef = doc(db, "users", currentUser.uid);

      if (isBlocked) {
        // Unblock user
        await updateDoc(userRef, {
          blockedUsers: arrayRemove(user.uid),
        });

        toast({
          title: "User unblocked",
          description: `You have unblocked ${user.displayName}.`,
        });

        setIsBlocked(false);
      } else {
        // Block user
        await updateDoc(userRef, {
          blockedUsers: arrayUnion(user.uid),
        });

        toast({
          title: "User blocked",
          description: `You have blocked ${user.displayName}. They will not be able to see your profile or send you messages.`,
        });

        setIsBlocked(true);
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
            <UserAvatar user={user} size="lg" isBlocked={isBlocked} />
          </div>

          <div className="text-center">
            <h3 className="text-xl font-semibold">{user.displayName}</h3>
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
              onClick={() => initiateCall(false)}
              disabled={isBlocked || isUserBlockedByContact}
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-12 w-12"
              onClick={() => initiateCall(true)}
              disabled={isBlocked || isUserBlockedByContact}
            >
              <Video className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
