"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface AudioMessageProps {
  src: string;
  duration?: number;
  fileName?: string;
  className?: string;
  isDark?: boolean;
  onLoad?: (audioElement: HTMLAudioElement | null) => void;
}

export function AudioMessage({
  src,
  duration = 0,
  fileName,
  className = "",
  isDark = false,
  onLoad,
}: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number>(0);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isSmallScreen = useMediaQuery("(max-width: 480px)");

  useEffect(() => {
    if (audioRef.current && onLoad) onLoad(audioRef.current);
  }, [onLoad]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleLoadedMetadata = () => setAudioDuration(audio.duration);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () =>
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audioCtxRef.current) return;

    const ctx = new AudioContext();
    const analyzer = ctx.createAnalyser();
    analyzer.fftSize = 64;
    analyzer.smoothingTimeConstant = 0.8;

    const source = ctx.createMediaElementSource(audio);
    source.connect(analyzer);
    analyzer.connect(ctx.destination);

    const bufferLength = analyzer.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    audioCtxRef.current = ctx;
    analyzerRef.current = analyzer;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const tick = () => {
      if (isPlaying && audio) {
        setCurrentTime(audio.currentTime);

        if (analyzerRef.current && dataArrayRef.current) {
          analyzerRef.current.getByteFrequencyData(
            dataArrayRef.current as Uint8Array<ArrayBuffer>
          );
          const normalizedData = Array.from(dataArrayRef.current).map(
            (v, i) => {
              const target =
                (v / 255) * (isSmallScreen ? 38 : isMobile ? 40 : 43);
              const prev = waveformData[i] || 0;
              const alpha = 0.6;
              return prev + (target - prev) * alpha;
            }
          );
          setWaveformData(normalizedData);
        }

        if (audio.currentTime >= audioDuration) {
          audio.pause();
          setIsPlaying(false);
          setCurrentTime(0);
          audio.currentTime = 0;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, audioDuration]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlayPause = useCallback(async () => {
    if (!audioCtxRef.current) return;
    if (audioCtxRef.current.state === "suspended")
      await audioCtxRef.current.resume();

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      await audioRef.current
        ?.play()
        .catch((err) => console.error("play error:", err));
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const toggleMute = () => setIsMuted((m) => !m);
  const handleVolumeChange = (v: number[]) => {
    setVolume(v[0]);
    if (v[0] > 0 && isMuted) setIsMuted(false);
  };
  const handleTimeChange = (v: number[]) => {
    const newTime = v[0];
    setCurrentTime(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const generateWaveform = () => {
    const bars = isSmallScreen ? 28 : isMobile ? 30 : waveformData.length || 32;
    return Array.from({ length: bars }, (_, i) => {
      const index = Math.round((i / bars) * waveformData.length);
      const height = waveformData[index] || 2;
      const isActive = i / bars < currentTime / audioDuration;
      return (
        <div
          key={i}
          className={`w-1 rounded-full ${
            isActive
              ? isDark
                ? "bg-primary"
                : "bg-primary-foreground"
              : isDark
              ? "bg-primary/30"
              : "bg-primary-foreground/30"
          }`}
          style={{ height: `${height}px`, transition: "height 0.1s linear" }}
        />
      );
    });
  };

  return (
    <div
      className={`rounded-lg ${
        isDark ? "bg-muted-foreground/20" : "bg-primary text-primary-foreground"
      } ${className} ${isSmallScreen ? "px-2 py-2" : "p-3"}`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <div
        className={`flex ${
          isSmallScreen ? "gap-2 w-full" : "items-center gap-3"
        }`}
      >
        <button
          onClick={togglePlayPause}
          className={`flex-shrink-0 ${
            isSmallScreen ? "h-8 w-8" : "h-10 w-10"
          } rounded-full flex items-center justify-center ${
            isDark
              ? "bg-primary/10 text-primary"
              : "bg-primary-foreground/20 text-primary-foreground"
          }`}
        >
          {isPlaying ? (
            <Pause className={isSmallScreen ? "h-4 w-4" : "h-5 w-5"} />
          ) : (
            <Play className={isSmallScreen ? "h-4 w-4" : "h-5 w-5"} />
          )}
        </button>

        <div className="flex-1 space-y-2">
          <div className="flex items-center h-10 gap-[2px]">
            {generateWaveform()}
          </div>

          <div
            className={`flex items-center ${
              isSmallScreen ? "gap-1 mt-2 justify-between" : "gap-2"
            }`}
          >
            <Slider
              value={[currentTime]}
              max={audioDuration || 100}
              step={0.1}
              onValueChange={handleTimeChange}
              className="flex-1"
            />
            {!isSmallScreen && (
              <div className="text-xs font-mono whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(audioDuration)}
              </div>
            )}
          </div>
          {isSmallScreen && (
            <div className="flex justify-between text-xs font-mono whitespace-nowrap w-full">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(audioDuration)}</span>
            </div>
          )}
        </div>

        {!isSmallScreen && (
          <div
            className="relative flex-shrink-0"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() =>
              setTimeout(() => setShowVolumeSlider(false), 4000)
            }
          >
            <button
              onClick={toggleMute}
              className={`h-8 w-8 rounded-full flex items-center justify-center ${
                isDark
                  ? "hover:bg-primary-foreground/20"
                  : "hover:bg-primary/10"
              }`}
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

      {fileName && !isSmallScreen && fileName !== "Audio message" && (
        <div className="mt-2 text-xs opacity-70 truncate">{fileName}</div>
      )}
    </div>
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);
  return matches;
}
