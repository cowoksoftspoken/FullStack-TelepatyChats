"use client";

import { useState } from "react";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { CheckCircle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFirebase } from "@/lib/firebase-provider";
import { toast } from "@/components/ui/use-toast";

export function VerificationRequest() {
  const { db, currentUser } = useFirebase();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingRequest, setHasExistingRequest] = useState(false);

  // Check for existing verification request
  const checkExistingRequest = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, "verificationRequests"),
        where("userId", "==", currentUser.uid),
        where("status", "==", "pending")
      );

      const querySnapshot = await getDocs(q);
      setHasExistingRequest(!querySnapshot.empty);
    } catch (error) {
      console.error("Error checking verification status:", error);
    }
  };

  const handleRequestVerification = async () => {
    if (!currentUser) return;
    if (!reason.trim()) {
      toast({
        variant: "destructive",
        title: "Reason required",
        description: "Please provide a reason for your verification request.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check for existing request first
      await checkExistingRequest();

      if (hasExistingRequest) {
        toast({
          variant: "destructive",
          title: "Request already exists",
          description: "You already have a pending verification request.",
        });
        setOpen(false);
        return;
      }

      // Add verification request to Firestore
      await addDoc(collection(db, "verificationRequests"), {
        userId: currentUser.uid,
        reason: reason.trim(),
        requestedAt: new Date().toISOString(),
        status: "pending",
      });

      toast({
        title: "Request submitted",
        description:
          "Your verification request has been submitted successfully.",
      });

      // Reset form and close dialog
      setReason("");
      setOpen(false);
    } catch (error) {
      console.error("Error submitting verification request:", error);
      toast({
        variant: "destructive",
        title: "Failed to submit request",
        description:
          "An error occurred while submitting your request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (newOpen) {
          checkExistingRequest();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="flex gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>Request Verification</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Account Verification</DialogTitle>
          <DialogDescription>
            Verified accounts get a blue checkmark and additional features.
            Please provide a reason why your account should be verified.
          </DialogDescription>
        </DialogHeader>

        {hasExistingRequest ? (
          <div className="py-6">
            <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
              <XCircle className="h-5 w-5" />
              <p>
                You already have a pending verification request. Please wait for
                it to be reviewed.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Reason for Verification
                </label>
                <Textarea
                  placeholder="Explain why your account should be verified..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={5}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRequestVerification}
                disabled={isSubmitting || !reason.trim()}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Submitting...</span>
                  </span>
                ) : (
                  <span>Submit Request</span>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
