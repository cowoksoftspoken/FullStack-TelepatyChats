"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useMediaQuery } from "@/hooks/use-media-query";

interface AudioMessageProps {
  src: string;
  duration?: number;
  fileName?: string;
  className?: string;
  isDark?: boolean;
}

export function AudioMessage({
  src,
  duration = 0,
  fileName,
  className = "",
  isDark = false,
}: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isSmallScreen = useMediaQuery("(max-width: 480px)");

  // Load audio metadata when component mounts
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  // Handle play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch((error) => {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
      });

      // Update current time
      intervalRef.current = setInterval(() => {
        setCurrentTime(audio.currentTime);
        if (audio.currentTime >= audioDuration) {
          setIsPlaying(false);
          setCurrentTime(0);
          audio.currentTime = 0;
        }
      }, 100);
    } else {
      audio.pause();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      audio.pause();
    };
  }, [isPlaying, audioDuration]);

  // Handle volume change
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (value[0] > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleTimeChange = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Generate a simple waveform visualization with responsive number of bars
  const generateWaveform = () => {
    const bars = isSmallScreen ? 15 : isMobile ? 20 : 30;
    const waveform = [];

    for (let i = 0; i < bars; i++) {
      const height =
        10 + Math.sin((i / (bars / 8)) * Math.PI) * 15 + Math.random() * 10;

      const isActive = i / bars < currentTime / audioDuration;

      waveform.push(
        <div
          key={i}
          className={`w-1 rounded-full ${
            isActive
              ? isDark
                ? "bg-primary-foreground"
                : "bg-primary"
              : isDark
              ? "bg-primary-foreground/30"
              : "bg-primary/30"
          }`}
          style={{ height: `${height}px` }}
        />
      );
    }

    return waveform;
  };

  return (
    <div
      className={`rounded-lg p-3 ${
        isDark ? "bg-primary text-primary-foreground" : "bg-muted"
      } ${className}`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <div
        className={`flex ${
          isSmallScreen ? "flex-col gap-2" : "items-center gap-3"
        }`}
      >
        {/* Play/Pause button */}
        <button
          onClick={togglePlayPause}
          className={`flex-shrink-0 ${
            isSmallScreen ? "h-8 w-8" : "h-10 w-10"
          } rounded-full flex items-center justify-center ${
            isDark
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-primary/10 text-primary"
          }`}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className={isSmallScreen ? "h-4 w-4" : "h-5 w-5"} />
          ) : (
            <Play className={isSmallScreen ? "h-4 w-4" : "h-5 w-5"} />
          )}
        </button>

        <div className="flex-1 space-y-2">
          {/* Waveform visualization */}
          <div className="flex items-center h-10 gap-[2px]">
            {generateWaveform()}
          </div>

          {/* Time slider and display */}
          <div
            className={`flex items-center ${
              isSmallScreen ? "flex-col gap-1" : "gap-2"
            }`}
          >
            <Slider
              value={[currentTime]}
              max={audioDuration || 100}
              step={0.1}
              onValueChange={handleTimeChange}
              className="flex-1"
            />
            <div
              className={`text-xs font-mono whitespace-nowrap ${
                isSmallScreen ? "self-end" : ""
              }`}
            >
              {formatTime(currentTime)} / {formatTime(audioDuration)}
            </div>
          </div>
        </div>

        {/* Volume control - hidden on small screens */}
        {!isSmallScreen && (
          <div className="relative flex-shrink-0">
            <button
              onClick={toggleMute}
              onMouseEnter={() => setShowVolumeSlider(true)}
              className={`h-8 w-8 rounded-full flex items-center justify-center ${
                isDark
                  ? "hover:bg-primary-foreground/20"
                  : "hover:bg-primary/10"
              }`}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>

            {showVolumeSlider && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded-lg shadow-lg bg-background border w-32"
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* File name if provided */}
      {fileName && fileName !== "Audio message" && (
        <div className="mt-2 text-xs opacity-70 truncate">{fileName}</div>
      )}
    </div>
  );
}
