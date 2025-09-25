"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
}: SystemMessageProps) {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl shadow-xl">
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
        </div>

        <DialogFooter className="flex justify-between gap-2 border-t px-4 py-3">
          {!forceRelogin && (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
          {forceRelogin && (
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={onRelogin}
            >
              Relogin
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
