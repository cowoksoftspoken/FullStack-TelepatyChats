"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  DownloadIcon,
  Maximize,
  Pause,
  PictureInPicture,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface VideoPlayerProps {
  fileURL: string;
  onLoad?: (videoElement: HTMLVideoElement | null) => void;
}

export default function VideoPlayer({ fileURL, onLoad }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [previewTime, setPreviewTime] = useState<number | null>(null);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoverRaf = useRef<number | null>(null);

  const lastClickTime = useRef<number>(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };
    const handlePiPChange = () =>
      setIsPiPActive(document.pictureInPictureElement !== null);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("enterpictureinpicture", handlePiPChange);
    document.addEventListener("leavepictureinpicture", handlePiPChange);
    // videoRef.current?.addEventListener("contextmenu", (e) => {
    //   e.preventDefault();
    // });
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("enterpictureinpicture", handlePiPChange);
      document.removeEventListener("leavepictureinpicture", handlePiPChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const container = videoContainerRef.current;
      if (container && !container.contains(e.target as Node)) {
        setShowControls(false);
        setShowPlayIcon(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!previewVideoRef.current) {
      const v = document.createElement("video");
      v.muted = true;
      v.preload = "metadata";
      v.src = fileURL;
      previewVideoRef.current = v;
    } else {
      previewVideoRef.current.src = fileURL;
    }
  }, [fileURL]);

  useEffect(() => {
    if (videoRef.current && onLoad) onLoad(videoRef.current);
  }, [onLoad]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
      videoRef.current.currentTime = 0.1;
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    updateProgressFromDrag(clientX);
  };

  const updateProgressFromDrag = (clientX: number) => {
    if (!progressBarRef.current || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const newProgress = (pos / rect.width) * 100;
    setProgress(newProgress);
    videoRef.current.currentTime =
      (videoRef.current.duration * newProgress) / 100;
  };

  const handleDragEnd = () => setIsDragging(false);

  const handleTimeUpdate = () => {
    if (!videoRef.current || !videoRef.current.duration) return;
    const progressValue =
      (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(progressValue);
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressBarRef.current && videoRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * videoRef.current.duration;
      setPreviewURL(null);
      setPreviewTime(null);
    }
  };

  const showVideoControls = () => {
    setShowControls(true);
    setShowPlayIcon(true);
  };

  const handleVideoClick = () => {
    const now = Date.now();
    if (now - lastClickTime.current < 300) return;
    lastClickTime.current = now;
    showVideoControls();
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const updateThumbnail = (time: number) => {
    const pv = previewVideoRef.current;
    const canvas = canvasRef.current;
    if (!pv || !canvas) return Promise.resolve();
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const onSeeked = () => {
        const w = Math.max(120, Math.floor(pv.videoWidth / 4));
        const h = Math.max(68, Math.floor(pv.videoHeight / 4));
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(pv, 0, 0, w, h);
        try {
          const data = canvas.toDataURL("image/jpeg", 0.7);
          setPreviewURL(data);
        } catch {
          setPreviewURL(null);
        }
        pv.removeEventListener("seeked", onSeeked);
        resolve();
      };
      if (pv.readyState < 1) {
        const onLoaded = () => {
          pv.removeEventListener("loadedmetadata", onLoaded);
          pv.currentTime = Math.min(time, pv.duration || time);
          pv.addEventListener("seeked", onSeeked);
        };
        pv.addEventListener("loadedmetadata", onLoaded);
      } else {
        pv.currentTime = Math.min(time, pv.duration || time);
        pv.addEventListener("seeked", onSeeked);
      }
    });
  };

  const handleProgressHoverRAF = (clientX: number) => {
    if (!progressBarRef.current || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const newProgress = pos / rect.width;
    const hoverTime = newProgress * videoRef.current.duration;
    setPreviewTime(hoverTime);
    updateThumbnail(hoverTime);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverRaf.current) cancelAnimationFrame(hoverRaf.current);
    hoverRaf.current = requestAnimationFrame(() =>
      handleProgressHoverRAF(e.clientX)
    );
  };

  const handleProgressLeave = () => {
    if (hoverRaf.current) cancelAnimationFrame(hoverRaf.current);
    hoverRaf.current = null;
    setPreviewURL(null);
    setPreviewTime(null);
  };

  const handleFullscreen = async () => {
    if (!isFullscreen) {
      await videoContainerRef.current?.requestFullscreen();
      if (screen.orientation && (screen.orientation as any).lock) {
        try {
          await (screen.orientation as any).lock("landscape");
        } catch {}
      }
    } else {
      await document.exitFullscreen();
      if (screen.orientation.unlock) screen.orientation.unlock();
    }
  };

  const togglePiP = async () => {
    try {
      if (!isPiPActive && videoRef.current)
        await videoRef.current.requestPictureInPicture();
      else if (document.pictureInPictureElement)
        await document.exitPictureInPicture();
    } catch (error) {
      console.error("PiP error:", error);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) videoRef.current.currentTime -= 10;
  };

  const skipForward = () => {
    if (videoRef.current) videoRef.current.currentTime += 10;
  };

  const handleDownload = () => {
    if (!videoRef.current) {
      toast.error("Video not available for download");
      return;
    }
    const link = document.createElement("a");
    link.href = videoRef.current.src;
    link.download = link.href.split("/").pop() || "video";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) updateProgressFromDrag(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) updateProgressFromDrag(e.touches[0].clientX);
    };
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleDragEnd);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleDragEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging]);

  return (
    <div
      className={`${
        isFullscreen
          ? "fixed inset-0 z-50 w-screen h-screen bg-black"
          : "max-w-full h-full bg-gray-900 rounded-xl"
      } flex items-center justify-center`}
    >
      <div
        ref={videoContainerRef}
        className={`w-full bg-black overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? "h-full rounded-none"
            : "max-w-4xl rounded-xl shadow-2xl"
        }`}
        onClick={() => {
          setShowControls(true);
          setShowPlayIcon(true);
        }}
      >
        <div className="relative group">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
          )}

          <video
            ref={videoRef}
            className={`max-w-full min-w-[90%] pointer-events-none ${
              isFullscreen
                ? "w-auto h-auto max-w-full max-h-screen mx-auto my-auto"
                : "aspect-video h-64 md:h-full"
            } cursor-pointer object-contain`}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={handleVideoClick}
            onError={(e) => {
              setIsLoading(false);
              toast.error("Error loading video");
              console.error("Video error:", e);
            }}
            onMouseMove={() => {
              setShowControls(true);
              setShowPlayIcon(true);
            }}
            preload="metadata"
            poster="https://telepaty.vercel.app/dark_icon/android-chrome-512x512.png"
            src={fileURL}
            controls={false}
            muted={isMuted}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            Your browser does not support the video tag.
          </video>

          {showPlayIcon && (
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              onClick={togglePlay}
            >
              <div
                className={`bg-purple-400/50 hover:bg-purple-500/50 rounded-full transition ${
                  isMobile ? "p-2.5" : "p-4"
                }`}
              >
                {isPlaying ? (
                  <Pause
                    className={`text-white ${isMobile ? "w-6 h-6" : "w-8 h-8"}`}
                    fill="currentColor"
                  />
                ) : (
                  <Play
                    className={`text-white ${isMobile ? "w-6 h-6" : "w-8 h-8"}`}
                    fill="currentColor"
                  />
                )}
              </div>
            </div>
          )}

          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.18 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4"
              >
                <div
                  ref={progressBarRef}
                  className="w-full h-1 bg-gray-600 rounded-full mb-4 cursor-pointer relative"
                  onMouseMove={handleProgressMouseMove}
                  onMouseLeave={handleProgressLeave}
                  onClick={handleProgressBarClick}
                >
                  {previewURL && previewTime !== null && (
                    <div
                      className="absolute bottom-6 transform -translate-x-1/2 z-50 flex flex-col items-center"
                      style={{
                        left: `${(previewTime / Math.max(duration, 1)) * 100}%`,
                      }}
                    >
                      <img
                        src={previewURL}
                        alt="thumbnail"
                        className="w-32 h-20 object-cover rounded-md border border-gray-700"
                      />
                      <p className="text-white text-xs bg-black/60 px-1 rounded mt-1">
                        {formatTime(previewTime)}
                      </p>
                    </div>
                  )}

                  <div
                    className="h-full bg-purple-500 rounded-full relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-purple-300 rounded-full shadow-lg"
                      onMouseDown={(e) => handleDragStart(e.clientX)}
                      onTouchStart={(e) =>
                        handleDragStart(e.touches[0].clientX)
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-4">
                    {(isFullscreen || !isMobile) && (
                      <button
                        onClick={skipBackward}
                        className={`text-white hover:text-purple-400 transition ${
                          isMobile ? "p-1" : "p-2"
                        }`}
                      >
                        <SkipBack
                          className={isMobile ? "w-4 h-4" : "w-5 h-5"}
                        />
                      </button>
                    )}

                    <button
                      onClick={togglePlay}
                      className={`text-white hover:text-purple-400 backdrop-blur-md bg-purple-500/30 rounded-full transition ${
                        isMobile ? "p-1.5" : "p-2"
                      }`}
                    >
                      {isPlaying ? (
                        <Pause
                          className={isMobile ? "w-4 h-4" : "w-5 h-5"}
                          fill="currentColor"
                        />
                      ) : (
                        <Play
                          className={isMobile ? "w-4 h-4" : "w-5 h-5"}
                          fill="currentColor"
                        />
                      )}
                    </button>

                    {(isFullscreen || !isMobile) && (
                      <button
                        onClick={skipForward}
                        className={`text-white hover:text-purple-400 transition ${
                          isMobile ? "p-1" : "p-2"
                        }`}
                      >
                        <SkipForward
                          className={isMobile ? "w-4 h-4" : "w-5 h-5"}
                        />
                      </button>
                    )}

                    <button
                      onClick={toggleMute}
                      className={`text-white hover:text-purple-400 transition ${
                        isMobile ? "p-1" : "p-2"
                      }`}
                    >
                      {isMuted ? (
                        <VolumeX className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
                      ) : (
                        <Volume2 className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
                      )}
                    </button>

                    <span
                      className={`text-white ${
                        isMobile ? "text-[10px]" : "text-xs md:text-sm"
                      }`}
                    >
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div
                    className={`flex items-center ${
                      isMobile ? "space-x-2" : "space-x-4"
                    }`}
                  >
                    <button
                      className={`text-white hover:text-purple-400 transition ${
                        isMobile ? "p-1" : "p-2"
                      }`}
                      title="Download"
                      onClick={handleDownload}
                    >
                      <DownloadIcon
                        className={isMobile ? "w-4 h-4" : "w-5 h-5"}
                      />
                    </button>

                    <button
                      onClick={togglePiP}
                      className={`text-white transition ${
                        isPiPActive
                          ? "text-purple-400"
                          : "hover:text-purple-400"
                      } ${isMobile ? "p-1" : "p-2"}`}
                      title="Picture-in-Picture"
                    >
                      <PictureInPicture
                        className={isMobile ? "w-4 h-4" : "w-5 h-5"}
                      />
                    </button>

                    <button
                      onClick={handleFullscreen}
                      className={`text-white hover:text-purple-400 transition ${
                        isMobile ? "p-1" : "p-2"
                      }`}
                    >
                      <Maximize className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      </div>
    </div>
  );
}
