"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  KeyRound,
  Loader2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
} from "@/utils/encryption";
import { set } from "idb-keyval";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirebase } from "@/lib/firebase-provider";

interface SystemMessageProps {
  message: string;
  title: string;
  description: string;
  open: boolean;
  onClose: () => void;
  type?: "info" | "success" | "error";
  forceRelogin?: boolean;
  onRelogin?: () => void;
  storageKey?: string;
  allowReset?: boolean;
}

export default function SystemNotif({
  message,
  title,
  description,
  open,
  onClose,
  type = "info",
  forceRelogin = false,
  onRelogin,
  storageKey = "hide_system_notif",
  allowReset = false,
}: SystemMessageProps) {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const { currentUser } = useFirebase();

  const iconMap = {
    info: <Info className="w-8 h-8 text-blue-500" />,
    success: <CheckCircle2 className="w-8 h-8 text-green-500" />,
    error: <AlertTriangle className="w-8 h-8 text-red-500" />,
  };

  const headerColor = {
    info: "bg-blue-50",
    success: "bg-green-50",
    error: "bg-red-50",
  };

  const handleClose = () => {
    if (localStorage && storageKey && dontShowAgain)
      localStorage.setItem(storageKey, "true");

    onClose();
  };

  const executeReset = async () => {
    if (!currentUser.uid) return;

    setIsResetting(true);

    try {
      const keyPair = await generateKeyPair();
      const exportedPublicKey = await exportPublicKey(keyPair.publicKey);
      const exportedPrivateKey = await exportPrivateKey(keyPair.privateKey);

      await setDoc(doc(db, "userKeys", currentUser.uid), {
        publicKey: exportedPublicKey,
        createdAt: new Date().toISOString(),
      });

      await set(
        `encryption_private_key_${currentUser.uid}`,
        exportedPrivateKey
      );

      window.location.reload();
    } catch (error) {
      console.error("Gagal reset keys:", error);
      alert("failed to reset key.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={isResetting ? undefined : handleClose}>
        <DialogContent className="sm:max-w-md w-[85%] p-0 overflow-hidden rounded-2xl shadow-xl">
          <div
            className={`flex items-center gap-3 p-4 border-b ${headerColor[type]}`}
          >
            {iconMap[type]}
            <div>
              <DialogTitle className="text-lg dark:text-black font-semibold">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 dark:text-black">
                {description}
              </DialogDescription>
            </div>
          </div>

          <div className="p-4 text-gray-700">
            <p className="mb-4 dark:text-white">{message}</p>

            {!forceRelogin && !allowReset && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dont-show-again"
                  checked={dontShowAgain}
                  onCheckedChange={(checked) => setDontShowAgain(!!checked)}
                />
                <label
                  htmlFor="dont-show-again"
                  className="text-sm font-medium text-gray-600 cursor-pointer dark:text-white"
                >
                  Don't show again
                </label>
              </div>
            )}

            {allowReset && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 rounded-md">
                <div className="flex gap-2 items-start">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    Resetting the key will make all old messages no longer
                    readable. Only do this if you lose your private key.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row justify-between gap-2 border-t px-4 py-3">
            {!forceRelogin && !isResetting && (
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            )}

            {forceRelogin && (
              <Button
                className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                onClick={onRelogin}
              >
                Relogin
              </Button>
            )}

            {allowReset && currentUser.uid && (
              <Button
                variant="destructive"
                onClick={() => setShowConfirm(true)}
                disabled={isResetting}
                className="w-full sm:w-auto gap-2"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Create New Key
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you super sure?</AlertDialogTitle>
            <AlertDialogDescription>
              If you reset your key, all old messages will be immediately lost.
              If you're absolutely sure, go ahead.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={executeReset}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
