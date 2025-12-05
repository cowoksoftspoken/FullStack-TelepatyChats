"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  RotateCw,
  FlipHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message } from "@/types/message";
// import { useDecryptedMedia } from "@/hooks/use-decrypted-media";
import { useMediaDecrypter } from "@/hooks/use-media-decrypter";

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage: {
    url: string;
    messageId: string;
    fileName?: string;
    isEncrypted: boolean;
    encryptedKey?: string;
    encryptedKeyForSelf?: string;
    iv?: string;
    fileType?: string;
    isSender: boolean;
    currentUserId: string;
    text: string;
  } | null;
  images: Message[];
  currentIndex: number;
  setCurrentViewingImage: (
    image: {
      url: string;
      messageId: string;
      fileName?: string;
      isEncrypted: boolean;
      encryptedKey?: string;
      encryptedKeyForSelf?: string;
      iv?: string;
      fileType?: string;
      isSender: boolean;
      currentUserId: string;
      text: string;
    } | null
  ) => void;
  setCurrentIndex: (index: number) => void;
  currentUser: any;
  decryptedImageCache?: Record<string, string>;
  getMessageText: (msg: Message) => string;
}

export function ImageViewer({
  isOpen,
  onClose,
  currentImage,
  images,
  currentIndex,
  setCurrentIndex,
  currentUser,
  setCurrentViewingImage,
  decryptedImageCache,
  getMessageText,
}: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const [rotation, setRotation] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // const { decryptedUrls, decryptAndCreateBlobUrl } = useDecryptedMedia();
  const { decrypt } = useMediaDecrypter();
  const [decryptedImageUrl, setDecryptedImageUrl] = useState<string | null>(
    null
  );

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setIsFlipped(false);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          navigateToPrevious();
          break;
        case "ArrowRight":
          navigateToNext();
          break;
        case "+":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navigateToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      updateCurrentImage(newIndex);
    }
  };

  const navigateToNext = () => {
    if (currentIndex < images.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      updateCurrentImage(newIndex);
    }
  };

  const updateCurrentImage = (index: number) => {
    const newImage = images[index];
    const cachedBlob = decryptedImageCache?.[newImage.id];
    const decryptedCaption = getMessageText(newImage);
    setCurrentViewingImage({
      url: cachedBlob || newImage.fileURL || "",
      messageId: newImage.id,
      fileName: newImage.fileName,
      isEncrypted: newImage.fileIsEncrypted || false,
      encryptedKey: newImage.fileEncryptedKey || "",
      encryptedKeyForSelf: newImage.fileEncryptedKeyForSelf || "",
      iv: newImage.fileIv || "",
      fileType: newImage.fileType || "image/jpeg",
      isSender: newImage.senderId === currentUser.uid,
      currentUserId: currentUser.uid,
      text: decryptedCaption || newImage.text || newImage.fileName || "",
    });
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

  const handleDownload = () => {
    if (!currentImage) return;
    // const imageUrl =
    //   currentImage.isEncrypted && decryptedUrls[currentImage.messageId]
    //     ? decryptedUrls[currentImage.messageId]
    //     : currentImage.url;
    const imageUrl = decryptedImageUrl || currentImage.url;
    const link = document.createElement("a");
    const customFilename = `tpy_${Date.now()}.${currentImage.fileName
      ?.split(".")
      .pop()}`;

    link.href = imageUrl;
    link.download =
      customFilename ||
      currentImage.fileName ||
      `${currentImage.messageId}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setStartPos({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const newX = e.clientX - startPos.x;
      const newY = e.clientY - startPos.y;
      setPosition({ x: newX, y: newY });
    }
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  const getCurrentImageUrl = () => {
    if (!currentImage) return "";
    return currentImage?.isEncrypted &&
      decryptedImageCache?.[currentImage.messageId]
      ? decryptedImageCache[currentImage.messageId]
      : currentImage?.url;
  };

  useEffect(() => {
    const decryptImage = async () => {
      const image = getCurrentImageUrl();
      setDecryptedImageUrl(null);

      if (currentImage?.url && currentImage.url.startsWith("blob:")) {
        setDecryptedImageUrl(currentImage.url);
        return;
      }

      if (currentImage?.isEncrypted) {
        const url = await decrypt({
          messageId: currentImage.messageId,
          fileURL: image,
          fileIsEncrypted: currentImage.isEncrypted,
          fileEncryptedKey: currentImage.encryptedKey as string,
          fileEncryptedKeyForSelf: currentImage.encryptedKeyForSelf as string,
          fileIv: currentImage.iv as string,
          fileType: currentImage.fileType as string,
          isSender: currentImage.isSender,
          currentUserId: currentUser.uid,
        });
        setDecryptedImageUrl(url);
      } else {
        setDecryptedImageUrl(image);
      }
    };
    decryptImage();
  }, [currentImage, decrypt, currentUser.uid, decryptedImageCache]);

  if (!isOpen || !currentImage) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-black/40 z-10">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-white"
            >
              <X className="h-6 w-6" />
            </Button>
            <span className="ml-2 text-white text-sm">
              {currentIndex + 1} / {images.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleZoomOut();
              }}
              className="text-white"
              title="Zoom Out"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleZoomIn();
              }}
              className="text-white"
              title="Zoom In"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setRotation((prev) => (prev + 90) % 360);
              }}
              className="text-white"
              title="Rotate"
            >
              <RotateCw className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped((prev) => !prev);
              }}
              className="text-white"
              title="Flip Horizontal"
            >
              <FlipHorizontal className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="text-white"
              title="Download"
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full h-10 w-10 z-20"
            onClick={(e) => {
              e.stopPropagation();
              navigateToPrevious();
            }}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}

        {currentIndex < images.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full h-10 w-10 z-20"
            onClick={(e) => {
              e.stopPropagation();
              navigateToNext();
            }}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}

        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            cursor: isDragging ? "grabbing" : scale > 1 ? "grab" : "default",
          }}
        >
          <motion.img
            src={decryptedImageUrl || "/placeholder.svg"}
            alt={currentImage.messageId}
            className="max-h-[90vh] max-w-[90vw] object-contain select-none"
            style={{
              transform: `
                translate(${position.x}px, ${position.y}px)
                rotate(${rotation}deg)
                scale(${scale})
                scaleX(${isFlipped ? -1 : 1})
              `,
            }}
            onDoubleClick={handleDoubleClick}
            draggable={false}
            datatype={currentImage.fileType}
          />
        </div>

        {currentImage.text && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/40 text-white text-center">
            <p className="text-sm truncate">{currentImage.text}</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
