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

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastClickTime = useRef<number>(0);
  const isMobile = useIsMobile();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };

    const handlePiPChange = () => {
      setIsPiPActive(document.pictureInPictureElement !== null);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("enterpictureinpicture", handlePiPChange);
    document.addEventListener("leavepictureinpicture", handlePiPChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("enterpictureinpicture", handlePiPChange);
      document.removeEventListener("leavepictureinpicture", handlePiPChange);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && onLoad) {
      onLoad(videoRef.current);
    }
  }, [onLoad]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
      videoRef.current.currentTime = 0.1;
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
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
    if (videoRef.current) {
      const progress =
        (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress);
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressBarRef.current && videoRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * videoRef.current.duration;
    }
  };

  const showVideoControls = () => {
    setShowControls(true);
    setShowPlayIcon(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
      setShowPlayIcon(false);
    }, 5000);
  };

  const handleVideoClick = () => {
    const now = Date.now();
    if (now - lastClickTime.current < 300) {
      return;
    }
    lastClickTime.current = now;
    showVideoControls();
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleDoubleClick = (e: MouseEvent) => {
      const rect = videoElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;

      if (x < width / 2) {
        videoElement.currentTime = Math.max(videoElement.currentTime - 10, 0);
      } else {
        videoElement.currentTime = Math.min(
          videoElement.currentTime + 10,
          videoElement.duration
        );
      }
    };

    videoElement.addEventListener("dblclick", handleDoubleClick);

    return () => {
      videoElement.removeEventListener("dblclick", handleDoubleClick);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      if (e.key === "ArrowLeft") {
        videoRef.current.currentTime = Math.max(
          videoRef.current.currentTime - 10,
          0
        );
      } else if (e.key === "ArrowRight") {
        videoRef.current.currentTime = Math.min(
          videoRef.current.currentTime + 10,
          videoRef.current.duration
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleFullscreen = async () => {
    if (!isFullscreen) {
      await videoContainerRef.current?.requestFullscreen();

      if (screen.orientation && (screen.orientation as any).lock) {
        if (videoRef.current) {
          try {
            await (screen.orientation as any).lock("landscape");
          } catch (err) {
            console.warn("Orientation lock failed:", err);
          }
        }
      }
    } else {
      await document.exitFullscreen();
      if (screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    }
  };

  const togglePiP = async () => {
    try {
      if (!isPiPActive && videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      } else if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
    } catch (error) {
      console.error("Failed to toggle Picture-in-Picture mode:", error);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime -= 10;
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime += 10;
    }
  };

  const handleDownload = () => {
    if (!videoRef.current) {
      toast.error("Video not available for download");
      return;
    }
    if (videoRef.current) {
      const link = document.createElement("a");
      link.href = videoRef.current.src;
      link.download = link.href.split("/").pop() || "video";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      updateProgressFromDrag(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      updateProgressFromDrag(e.touches[0].clientX);
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
      >
        <div className="relative group">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
          )}

          <video
            ref={videoRef}
            className={`max-w-full min-w-[90%] ${
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
            onMouseMove={showVideoControls}
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
                className={`
        bg-purple-400/50 hover:bg-purple-500/50 rounded-full transition
        ${isMobile ? "p-2.5" : "p-4"}
      `}
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

          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transform transition-all duration-300 ${
              showControls
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-1"
            }`}
          >
            <div
              ref={progressBarRef}
              className="w-full h-1 bg-gray-600 rounded-full mb-4 cursor-pointer"
              onClick={handleProgressBarClick}
            >
              <div
                className="h-full bg-purple-500 rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                <div
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-purple-300 rounded-full shadow-lg"
                  onMouseDown={(e) => handleDragStart(e.clientX)}
                  onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
                ></div>
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
                    <SkipBack className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
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
                    <SkipForward className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
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
                  <DownloadIcon className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
                </button>

                <button
                  onClick={togglePiP}
                  className={`text-white transition ${
                    isPiPActive ? "text-purple-400" : "hover:text-purple-400"
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
          </div>

          {/* <style jsx>{`
            @keyframes fade-out {
              0% {
                opacity: 1;
                transform: scale(1);
              }
              50% {
                opacity: 0.5;
                transform: scale(1.2);
              }
              100% {
                opacity: 0;
                transform: scale(1.5);
              }
            }
            .animate-fade-out {
              animation: fade-out 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
          `}</style> */}
        </div>
      </div>
    </div>
  );
}
