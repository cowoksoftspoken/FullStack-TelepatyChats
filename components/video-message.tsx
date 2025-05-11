"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  PictureInPicture,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const playIconTimeoutRef = useRef<number | null>(null);
  const isMobile = useIsMobile();

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

  const handleVideoClick = () => {
    togglePlay();
    setShowPlayIcon(true);

    if (playIconTimeoutRef.current) {
      window.clearTimeout(playIconTimeoutRef.current);
    }

    playIconTimeoutRef.current = window.setTimeout(() => {
      setShowPlayIcon(false);
    }, 500);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

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

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleFullscreen = async () => {
    if (!isFullscreen) {
      await videoContainerRef.current?.requestFullscreen();

      if (screen.orientation && (screen.orientation as any).lock) {
        try {
          await (screen.orientation as any).lock("landscape");
        } catch (err) {
          console.warn("Orientation lock failed:", err);
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

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && videoRef.current) {
        setIsPlaying(!videoRef.current.paused);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div className="max-w-full h-full rounded-xl object-cover bg-gray-900 flex items-center justify-center">
      <div
        ref={videoContainerRef}
        className={`w-full bg-black overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? "h-screen w-screen rounded-none"
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
            className="w-full aspect-video cursor-pointer"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={handleVideoClick}
            preload="metadata"
            poster="https://zerochats.vercel.app/logo/8b2dd08b-d439-4116-b798-89421c394982.png"
            src={fileURL}
            onCanPlayThrough={() => setIsLoading(false)}
            controls={false}
            muted={isMuted}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            Your browser does not support the video tag.
          </video>

          <style jsx>{`
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
          `}</style>

          {showPlayIcon && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="bg-black/50 rounded-full p-4 animate-fade-out">
                {isPlaying ? (
                  <Pause className="text-white w-8 h-8 sm:w-10 sm:h-10 md:w-10 md:h-10" />
                ) : (
                  <Play className="text-white w-8 h-8 sm:w-10 sm:h-10 md:w-10 md:h-10" />
                )}
              </div>
            </div>
          )}

          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transform transition-all duration-300 ${
              isFullscreen
                ? "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0"
                : "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0"
            }`}
          >
            <div
              ref={progressBarRef}
              className="w-full h-1 bg-gray-600 rounded-full mb-4 cursor-pointer"
              onClick={handleProgressBarClick}
              role="slider"
              aria-valuenow={currentTime}
              aria-valuemin={0}
              aria-valuemax={duration}
            >
              <div
                className="h-full bg-purple-500 rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-purple-300 rounded-full shadow-lg"></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 md:space-x-4 gap-2 md:gap-0">
                {(isFullscreen || !isMobile) && (
                  <button
                    onClick={skipBackward}
                    className={`text-white hover:text-purple-400 transition`}
                  >
                    <SkipBack className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                )}

                <button
                  onClick={togglePlay}
                  className="text-white hover:text-purple-400 transition p-2 bg-purple-500/30 rounded-full"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <Play className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </button>

                {(isFullscreen || !isMobile) && (
                  <button
                    onClick={skipForward}
                    className="text-white hover:text-purple-400 transition"
                  >
                    <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                )}

                <button
                  onClick={toggleMute}
                  className="text-white hover:text-purple-400 transition"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </button>
                <span className="text-white text-xs md:text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={togglePiP}
                  className={`text-white transition ${
                    isPiPActive ? "text-purple-400" : "hover:text-purple-400"
                  }`}
                  title="Picture-in-Picture"
                >
                  <PictureInPicture className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button
                  onClick={handleFullscreen}
                  className="text-white hover:text-purple-400 transition"
                >
                  <Maximize className="w-4 h-4  md:w-5 md:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
