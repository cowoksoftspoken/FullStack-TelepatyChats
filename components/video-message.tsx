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
  Settings,
  X,
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
  const [showControls, setShowControls] = useState(true);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const playIconTimeoutRef = useRef<number | null>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastClickTime = useRef<number>(0);
  const isMobile = useIsMobile();

  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const toggleSettingsMenu = () => {
    setShowSettingsMenu((prev) => !prev);
  };

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
    }, 3000);
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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

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

          <div
            className={`absolute top-2 right-2 z-10 ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
          >
            <button
              onClick={toggleSettingsMenu}
              className="text-white hover:text-purple-400 transition"
            >
              <Settings className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
          {showSettingsMenu && (
            <div
              className={`mt-2 bg-black/80 text-white p-4 rounded shadow-lg space-y-2 text-sm    ${
                isMobile
                  ? "w-full h-full text-[60%]"
                  : "top-4 absolute right-4 z-10"
              }`}
            >
              <div>
                <div className="flex justify-between items-center py-1">
                  <label className="block mb-2">Speed</label>
                  {!isMobile && (
                    <button>
                      <X
                        className="w-4 h-4 md:w-5 md:h-5"
                        onClick={toggleSettingsMenu}
                      />
                    </button>
                  )}
                </div>
                <select
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                  className="bg-gray-800 text-white px-2 py-1 rounded w-full"
                >
                  {[0.25, 0.5, 1, 1.25, 1.5, 2].map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}x
                    </option>
                  ))}
                </select>
              </div>
              {!isMobile && (
                <div className="border-t border-white/10 pt-2 text-xs space-y-1 font-mono text-gray-300">
                  <p>
                    <span className="text-purple-400">Resolution:</span>{" "}
                    {videoRef.current?.videoWidth}x
                    {videoRef.current?.videoHeight}
                  </p>
                  <p>
                    <span className="text-purple-400">Time:</span>{" "}
                    {videoRef.current?.currentTime.toFixed(1)} /{" "}
                    {videoRef.current?.duration.toFixed(1)}
                  </p>
                  <p>
                    <span className="text-purple-400">Bitrate:</span>{" "}
                    {(videoRef.current as any)?.webkitVideoDecodedByteCount &&
                    videoRef.current?.buffered.length
                      ? Math.round(
                          ((videoRef.current as any)
                            .webkitVideoDecodedByteCount *
                            8) /
                            videoRef.current.buffered.end(0)
                        ).toLocaleString()
                      : 0}{" "}
                    kbps
                  </p>
                  <p>
                    <span className="text-purple-400">Dropped:</span>{" "}
                    {(videoRef.current as any)?.webkitDroppedFrameCount}
                  </p>
                  <p>
                    <span className="text-purple-400">Total:</span>{" "}
                    {(videoRef.current as any)?.webkitDecodedFrameCount}
                  </p>
                  <p>
                    <span className="text-purple-400">Buffered:</span>{" "}
                    {(() => {
                      const b = videoRef.current?.buffered;
                      if (!b) return "0";
                      const ranges = [];
                      for (let i = 0; i < b.length; i++) {
                        ranges.push(
                          `${b.start(i).toFixed(2)}–${b.end(i).toFixed(2)}`
                        );
                      }
                      return ranges.join(", ");
                    })()}
                  </p>
                  <p>
                    <span className="text-purple-400">Speed:</span>{" "}
                    {videoRef.current?.playbackRate}x
                  </p>
                  <p>
                    <span className="text-purple-400">ReadyState:</span>{" "}
                    {videoRef.current?.readyState}
                  </p>
                  <p>
                    <span className="text-purple-400">Network:</span>{" "}
                    {videoRef.current?.networkState}
                  </p>
                </div>
              )}
            </div>
          )}

          <video
            ref={videoRef}
            className={`w-full h-full ${
              isFullscreen
                ? "w-auto h-auto max-w-full max-h-screen object-contain mx-auto my-auto"
                : "aspect-video"
            } cursor-pointer object-contain`}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={handleVideoClick}
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
              <div className="bg-purple-400/50 hover:bg-purple-500/50 rounded-full p-4">
                {isPlaying ? (
                  <Pause className="text-white w-8 h-8" fill="currentColor" />
                ) : (
                  <Play className="text-white w-8 h-8" fill="currentColor" />
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
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-purple-300 rounded-full shadow-lg"></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 md:space-x-4 gap-2 md:gap-0">
                {(isFullscreen || !isMobile) && (
                  <button
                    onClick={skipBackward}
                    className="text-white hover:text-purple-400"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-purple-400 p-2 backdrop-blur-md bg-purple-500/30 rounded-full"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" fill="currentColor" />
                  ) : (
                    <Play className="w-5 h-5" fill="currentColor" />
                  )}
                </button>
                {(isFullscreen || !isMobile) && (
                  <button
                    onClick={skipForward}
                    className="text-white hover:text-purple-400"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-purple-400"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
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
                  <PictureInPicture className="w-5 h-5" />
                </button>
                <button
                  onClick={handleFullscreen}
                  className="text-white hover:text-purple-400"
                >
                  <Maximize className="w-5 h-5" />
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
