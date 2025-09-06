"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import dynamic from "next/dynamic";
const BarcodeScanner = dynamic(() => import("react-qr-barcode-scanner"), {
  ssr: false,
});

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onResult: (data: any) => void;
}

export function QRScannerModal({
  open,
  onClose,
  onResult,
}: QRScannerModalProps) {
  const [data, setData] = React.useState<any>(null);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[90%] sm:w-full p-0 overflow-hidden rounded-2xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-transparent via-muted-foreground/20 to-black">
          <DialogHeader className="p-0">
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <Camera className="w-5 h-5" /> Scan QR Code
            </DialogTitle>
            <DialogDescription className="text-white/80 text-xs">
              Point your camera at a backup QR to import your private key.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-100 via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-black">
          <div className="rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 w-full">
            {open && (
              <BarcodeScanner
                width={400}
                height={400}
                stopStream={open}
                onUpdate={(err, result) => {
                  if (result) {
                    setData(result);
                    onResult(result.getText());
                    console.log(data);
                  }
                }}
                facingMode="environment"
                delay={300}
              />
            )}
          </div>

          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
            Make sure the QR code is well-lit and fully visible.
          </p>
        </div>

        <DialogFooter className="flex justify-end gap-2 p-4 border-t bg-gray-50 dark:bg-gray-900">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
