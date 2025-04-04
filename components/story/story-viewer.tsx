"use client";

import { useState, useEffect, useRef } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useFirebase } from "@/lib/firebase-provider";
import type { Story } from "@/types/story";
import type { User } from "@/types/user";

interface StoryViewerProps {
  stories: Story[];
  initialStoryIndex?: number;
  onClose: () => void;
  users: Record<string, User>;
}

export function StoryViewer({
  stories,
  initialStoryIndex = 0,
  onClose,
  users,
}: StoryViewerProps) {
  const { db, currentUser } = useFirebase();
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const storyDuration = 5000; // 5 seconds for images

  const currentStory = stories[currentIndex];
  const storyUser = users[currentStory?.userId];

  // Mark story as viewed
  useEffect(() => {
    if (!currentStory || !currentUser) return;

    const markAsViewed = async () => {
      try {
        // Only mark as viewed if the current user hasn't viewed it yet
        if (!currentStory.viewers.includes(currentUser.uid)) {
          await updateDoc(doc(db, "stories", currentStory.id), {
            viewers: arrayUnion(currentUser.uid),
          });
        }
      } catch (error) {
        console.error("Error marking story as viewed:", error);
      }
    };

    markAsViewed();
  }, [currentStory, currentUser, db]);

  // Handle story progression
  useEffect(() => {
    if (!currentStory || isPaused) return;
    setIsLoading(true);

    // Clear any existing interval
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    setProgress(0);

    const duration =
      currentStory.mediaType === "video"
        ? (videoRef.current?.duration || 10) * 1000
        : storyDuration;

    // Start progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 100 / (duration / 100);

        if (newProgress >= 100) {
          clearInterval(interval);
          // Move to next story
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
          } else {
            onClose();
          }
          return 0;
        }

        return newProgress;
      });
    }, 100);

    progressInterval.current = interval;

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentStory, isPaused, currentIndex, stories.length, onClose]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);

    if (currentStory.mediaType === "video" && videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);

    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const storyTime = new Date(timestamp);
    const diffInSeconds = Math.floor(
      (now.getTime() - storyTime.getTime()) / 1000
    );

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)}d`;
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Close button */}
      <button
        className="absolute right-4 top-4 z-50 text-white"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>

      {/* Story navigation */}
      <button
        className="absolute left-4 top-1/2 z-50 -translate-y-1/2 text-white"
        onClick={handlePrevious}
        disabled={currentIndex === 0}
      >
        <ChevronLeft
          className={`h-8 w-8 ${currentIndex === 0 ? "opacity-50" : ""}`}
        />
      </button>

      <button
        className="absolute right-4 top-1/2 z-50 -translate-y-1/2 text-white"
        onClick={handleNext}
      >
        <ChevronRight className="h-8 w-8" />
      </button>

      {/* Progress bars */}
      <div className="absolute top-2 left-0 right-0 z-50 flex gap-1 px-4">
        {stories.map((story, index) => (
          <div
            key={story.id}
            className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden"
          >
            <div
              className="h-full bg-white"
              style={{
                width:
                  index === currentIndex
                    ? `${progress}%`
                    : index < currentIndex
                    ? "100%"
                    : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* User info */}
      <div className="absolute top-6 left-0 right-0 z-50 flex items-center gap-3 px-4">
        <UserAvatar
          user={storyUser}
          className="h-10 w-10 border-2 border-primary"
        />
        <div className="text-white">
          <p className="font-medium flex items-center">
            {storyUser?.displayName}
            {storyUser?.isVerified && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 text-white"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
            )}
          </p>
          <p className="text-xs opacity-80">
            {formatTimeAgo(currentStory.createdAt)}
          </p>
        </div>
      </div>

      {/* Story content */}
      <div className="relative h-full w-full max-w-md">
        {currentStory.mediaType === "image" ? (
          <img
            src={currentStory.mediaUrl || "/placeholder.svg"}
            alt="Story"
            className="h-full w-full object-contain"
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <video
            ref={videoRef}
            src={currentStory.mediaUrl}
            className="h-full w-full object-contain"
            autoPlay
            playsInline
            muted={isMuted}
            onLoadedData={() => setIsLoading(false)}
            onEnded={handleNext}
          />
        )}

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-20 left-0 right-0 p-4">
            <p className="text-center text-white text-shadow-sm">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-black/30 text-white"
            onClick={togglePause}
          >
            {isPaused ? (
              <Play className="h-5 w-5" />
            ) : (
              <Pause className="h-5 w-5" />
            )}
          </Button>

          {currentStory.mediaType === "video" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-black/30 text-white"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      )}
    </div>
  );
}
