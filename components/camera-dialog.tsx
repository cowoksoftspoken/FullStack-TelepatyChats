import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, RefreshCw, Image as ImageIcon } from "lucide-react";

interface CameraDialogProps {
  open: boolean;
  onClose: () => void;
  onCapture: (imageBlob: Blob, caption: string) => Promise<void>;
}

export function CameraDialog({ open, onClose, onCapture }: CameraDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setCaption("");
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      startCamera();
    }
  }, [isFrontCamera]);

  const startCamera = async () => {
    try {
      if (stream) {
        stopCamera();
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: isFrontCamera ? "user" : "environment",
        },
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setHasCameraPermission(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const switchCamera = () => {
    setIsFrontCamera((prev) => !prev);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (isFrontCamera) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageDataUrl = canvas.toDataURL("image/jpeg");
        setCapturedImage(imageDataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleSendCapture = async () => {
    if (!capturedImage) return;

    try {
      setIsLoading(true);

      const response = await fetch(capturedImage);
      const blob = await response.blob();

      await onCapture(blob, caption);
      onClose();
    } catch (error) {
      console.error("Error sending captured image:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-2 pb-2">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Camera
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center px-6 pb-6">
          {hasCameraPermission === false && (
            <div className="text-center py-4 w-full bg-red-50 dark:bg-red-900/20 rounded-md">
              <p className="font-medium text-red-600 dark:text-red-400">
                Camera access denied
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Please check your browser permissions.
              </p>
            </div>
          )}

          {capturedImage ? (
            <div className="w-full mt-4">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-80 object-contain rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm"
              />
            </div>
          ) : (
            <div
              className={`relative w-full h-80 rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-700 mt-4`}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: isFrontCamera ? "scaleX(-1)" : "none" }}
              />
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {hasCameraPermission && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {isFrontCamera ? "Front Camera" : "Back Camera"}
            </p>
          )}

          {!capturedImage && stream && (
            <div className="flex justify-center gap-6 mt-4">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-12 w-12 flex items-center justify-center border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
                onClick={switchCamera}
                title="Switch Camera"
              >
                <RefreshCw className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </Button>

              <Button
                className="rounded-full h-14 w-14 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition"
                onClick={captureImage}
                title="Capture Photo"
              >
                <Camera className="h-6 w-6" />
              </Button>
            </div>
          )}

          {capturedImage && (
            <div className="w-full space-y-4 mt-2">
              <div className="space-y-2">
                <Label
                  htmlFor="caption"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Caption (optional)
                </Label>
                <Textarea
                  id="caption"
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  className="resize-none rounded-lg border-gray-300 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              <div className="flex justify-between gap-4">
                <Button
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
                  onClick={retakePhoto}
                >
                  <RefreshCw className="h-4 w-4" /> Retake
                </Button>
                <Button
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
                  onClick={handleSendCapture}
                  disabled={isLoading}
                >
                  <ImageIcon className="h-4 w-4" />
                  {isLoading ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
