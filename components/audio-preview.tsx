import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

function AudioPreviewPlayer({
  src,
  duration,
}: {
  src: string;
  duration: number;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex items-center justify-center w-10 h-10 rounded-full 
            bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400
            hover:bg-blue-200 dark:hover:bg-blue-800 transition"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </button>

        {/* Progress Bar & Time */}
        <div className="flex-1">
          <div className="h-1 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-1 bg-blue-500 dark:bg-blue-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AudioPreview({ previewFile }: any) {
  return (
    previewFile?.type === "audio" && (
      <div
        className="flex flex-col items-center gap-3 p-4 rounded-xl
          bg-white dark:bg-neutral-900
          border border-gray-200 dark:border-neutral-800
          shadow-sm transition-colors w-full"
      >
        <AudioPreviewPlayer
          src={previewFile.preview}
          duration={previewFile.duration}
        />

        <div className="text-center w-full flex items-center justify-between">
          <p className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[200px] mx-auto">
            {previewFile.file.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {previewFile.file.size < 1024 * 1024
              ? `${(previewFile.file.size / 1024).toFixed(2)} KB`
              : `${(previewFile.file.size / (1024 * 1024)).toFixed(2)} MB`}
          </p>
        </div>
      </div>
    )
  );
}
