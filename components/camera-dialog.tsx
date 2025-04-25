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
import { Camera, RefreshCw, X, Image as ImageIcon } from "lucide-react";

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
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDevices = async () => {
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceInfos.filter(
        (device) => device.kind === "videoinput"
      );
      setDevices(videoDevices);
    };

    fetchDevices();
  }, []);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setCaption("");
    }
  }, [open]);

  const startCamera = async (deviceId: string | null = null) => {
    try {
      if (stream) {
        stopCamera();
      }

      const facingMode = isFrontCamera ? "user" : "environment";
      const constraints = {
        video: {
          facingMode,
          deviceId: deviceId ? { exact: deviceId } : undefined,
        },
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setCurrentDeviceId(deviceId || null);
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
    setIsFrontCamera(!isFrontCamera);

    const nextDevice = devices.find(
      (device) => device.deviceId !== currentDeviceId
    );
    if (nextDevice) {
      startCamera(nextDevice.deviceId);
    }
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Camera</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center mt-2">
          {hasCameraPermission === false && (
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
              <p>Camera access denied or not available.</p>
              <p className="text-sm mt-2">
                Please check your browser permissions.
              </p>
            </div>
          )}

          {capturedImage ? (
            <div className="w-full">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-72 object-contain rounded-md border"
              />
            </div>
          ) : (
            <div className="relative w-full h-72 rounded-md overflow-hidden border">
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
          {devices[0]?.label && (
            <p className="mt-2 text-sm">{devices[0].label}</p>
          )}
          {!capturedImage && stream && (
            <div className="flex justify-center gap-4 mt-4">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-12 w-12"
                onClick={switchCamera}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>

              <Button className="rounded-full h-12 w-12" onClick={captureImage}>
                <Camera className="h-5 w-5" />
              </Button>
            </div>
          )}

          {capturedImage && (
            <div className="w-full space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="caption">Caption (optional)</Label>
                <Textarea
                  id="caption"
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={retakePhoto}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button onClick={handleSendCapture} disabled={isLoading}>
                  <ImageIcon className="h-4 w-4 mr-2" />
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
