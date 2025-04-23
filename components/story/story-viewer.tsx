"use client";

import { useState, useEffect, useRef } from "react";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useFirebase } from "@/lib/firebase-provider";
import type { Story } from "@/types/story";
import type { User } from "@/types/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isMediaReady, setIsMediaReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const IMAGE_DURATION = 30000;

  const currentStory = stories[currentIndex];
  const storyUser = users[currentStory?.userId];

  const [showViewers, setShowViewers] = useState(false);
  const [viewersData, setViewersData] = useState<
    Array<{
      id: string;
      displayName: string;
      photoURL: string;
      lastSeen: {
        seconds: number;
      };
    }>
  >([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const savedProgressRef = useRef(0);

  useEffect(() => {
    setProgress(0);
    setIsLoading(true);
    setIsMediaReady(false);

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, [currentIndex]);

  const fetchViewersData = async () => {
    if (!currentStory) return;

    setViewersLoading(true);
    try {
      const storiesDoc = await getDoc(doc(db, "stories", currentStory.id));

      if (!storiesDoc.exists()) {
        setViewersData([]);
        return;
      }

      const filteredViewers = storiesDoc
        .data()
        .viewers.filter((viewerId: string) => viewerId !== currentStory.userId);

      if (filteredViewers.length === 0) {
        setViewersData([]);
        return;
      }

      const viewersPromises = filteredViewers.map(async (viewerId: string) => {
        const userDoc = await getDoc(doc(db, "users", viewerId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return {
            id: viewerId,
            displayName: userData.displayName || "Anonymous User",
            photoURL: userData.photoURL || "",
            lastSeen: userData.lastSeen || new Date().toISOString(),
          };
        }
        return null;
      });

      const results = await Promise.all(viewersPromises);
      setViewersData(
        results.filter(Boolean) as {
          id: string;
          displayName: string;
          photoURL: string;
          lastSeen: {
            seconds: number;
          };
        }[]
      );
    } catch (error) {
      console.error("Error fetching viewers data:", error);
    } finally {
      setViewersLoading(false);
    }
  };

  useEffect(() => {
    fetchViewersData();

    if (showViewers) {
      savedProgressRef.current = progress;
      setIsPaused(true);
      if (currentStory.mediaType === "video" && videoRef.current) {
        videoRef.current.pause();
      }
    } else if (savedProgressRef.current > 0) {
      setProgress(savedProgressRef.current);
    }
  }, [showViewers, currentUser, currentStory]);

  const toggleViewers = () => {
    setShowViewers(!showViewers);
  };

  useEffect(() => {
    if (!currentStory || !currentUser) return;

    const markAsViewed = async () => {
      try {
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

  useEffect(() => {
    if (!currentStory || !isMediaReady || isPaused) return;

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    const duration =
      currentStory.mediaType === "video" && videoRef.current
        ? videoRef.current.duration * 1000
        : IMAGE_DURATION;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 100 / (duration / 100);

        if (newProgress >= 100) {
          clearInterval(interval);
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
  }, [
    currentStory,
    isPaused,
    currentIndex,
    stories.length,
    onClose,
    isMediaReady,
  ]);

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

  const handleMediaLoaded = () => {
    setIsLoading(false);
    setIsMediaReady(true);
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
  // console.log(
  //   currentStory.viewers,
  //   currentStory.id,
  //   currentStory.userId,
  //   viewersData
  // );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <button
        className="absolute right-4 top-4 z-50 text-white"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>

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
                    ? !isMediaReady
                      ? "0%"
                      : `${progress}%`
                    : index < currentIndex
                    ? "100%"
                    : "0%",
              }}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-6 left-0 right-0 z-50 flex items-center gap-3 px-4">
        <UserAvatar
          user={storyUser}
          className="h-10 w-10 border-2 border-primary"
        />
        <div className="text-white">
          <p className="font-medium flex items-center gap-1">
            {storyUser?.uid === currentUser?.uid ? (
              <span className="text-primary">You</span>
            ) : (
              <span>{storyUser?.displayName}</span>
            )}
            {storyUser?.isVerified && (
              <svg
                aria-label="Sudah Diverifikasi"
                fill="rgb(0, 149, 246)"
                height="16"
                role="img"
                viewBox="0 0 40 40"
                width="16"
              >
                <title>Sudah Diverifikasi</title>
                <path
                  d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                  fillRule="evenodd"
                ></path>
              </svg>
            )}
          </p>
          <p className="text-xs opacity-80">
            {formatTimeAgo(currentStory.createdAt)}
          </p>
        </div>
      </div>

      <div className="relative h-full w-full max-w-md">
        {currentStory.mediaType === "image" ? (
          <img
            src={currentStory.mediaUrl || "/placeholder.svg"}
            alt="Story"
            className="h-full w-full object-contain"
            onLoad={handleMediaLoaded}
          />
        ) : (
          <video
            ref={videoRef}
            src={currentStory.mediaUrl}
            className="h-full w-full object-contain"
            autoPlay
            playsInline
            muted={isMuted}
            onLoadedData={handleMediaLoaded}
            onEnded={handleNext}
          />
        )}

        {currentStory.caption && (
          <div className="absolute bottom-20 left-0 right-0 p-4">
            <p className="text-center text-white text-shadow-sm">
              {currentStory.caption}
            </p>
          </div>
        )}

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

          {viewersData &&
            viewersData.length > 0 &&
            currentStory.userId === currentUser?.uid && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-black/30 text-white"
                onClick={toggleViewers}
              >
                <Users className="h-5 w-5" />
              </Button>
            )}
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      )}

      <AnimatePresence>
        {showViewers && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 500 }}
            className="absolute bottom-0 left-0 right-0 z-50 bg-background/95 rounded-t-xl backdrop-blur-sm md:max-w-2xl max-w-full mx-auto"
            style={{ height: "50vh" }}
          >
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="font-medium">Viewers</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowViewers(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="p-4" style={{ height: "calc(50vh - 60px)" }}>
              {viewersLoading ? (
                <div className="flex justify-center p-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </div>
              ) : viewersData.length > 0 ? (
                <div className="space-y-3">
                  {viewersData.map((viewer) => (
                    <Card
                      key={viewer.id}
                      className="p-3 flex items-center gap-3"
                    >
                      <Avatar>
                        <AvatarImage
                          src={viewer.photoURL}
                          alt={viewer.displayName}
                          className="object-cover"
                        />
                        <AvatarFallback>
                          {viewer.displayName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{viewer.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          Seen{" "}
                          {formatDistanceToNow(
                            new Date(viewer.lastSeen.seconds * 1000),
                            {
                              addSuffix: true,
                            }
                          )}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground p-4">
                  No viewers data available
                </p>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
