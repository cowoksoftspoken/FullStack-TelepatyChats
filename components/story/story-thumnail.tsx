"use client";
import { AlertCircle, PlayCircle } from "lucide-react";
import { useState } from "react";

export function StoryThumbnail({ context }: { context: any }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="h-full w-full bg-muted/50 flex flex-col items-center justify-center p-1 text-muted-foreground border border-border/50">
        <AlertCircle className="h-4 w-4 mb-1 opacity-50" />
        <span className="text-[8px] font-medium leading-tight text-center">
          Unavailable
        </span>
      </div>
    );
  }

  if (context.mediaType === "video" && context.storyUrl) {
    return (
      <div className="relative h-full w-full">
        <video
          src={context.storyUrl}
          className="h-full w-full object-cover opacity-90"
          muted
          preload="metadata"
          onError={() => setHasError(true)}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <PlayCircle className="w-4 h-4 text-white/80 drop-shadow-md" />
        </div>
      </div>
    );
  }

  if (context.storyUrl) {
    return (
      <img
        src={context.storyUrl}
        alt="Story"
        className="h-full w-full object-cover"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className="h-full w-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex flex-col items-center justify-center p-1">
      <span className="text-[8px] font-medium text-center break-words leading-tight opacity-70">
        Story Text
      </span>
    </div>
  );
}
