"use client";

import { useState, useEffect, useRef } from "react";
import {
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Users,
  Lock,
  Music,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useFirebase } from "@/lib/firebase-provider";
import type { Story } from "@/types/story";
import type { User } from "@/types/user";
import { useEncryption } from "../../hooks/use-encryption";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "../ui/use-toast";
import { deleteObject, ref } from "firebase/storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

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
  const { db, storage, currentUser } = useFirebase();
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const { decryptMessageFromContact, isInitialized } =
    useEncryption(currentUser);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const IMAGE_DURATION = 30000;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setProgress(0);
    setIsLoading(true);
    setIsMediaReady(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (currentStory?.musicUrl) {
      const audio = new Audio(currentStory.musicUrl);
      audio.loop = true;
      audio.volume = isMuted ? 0 : 0.5;
      audioRef.current = audio;
    }

    if (currentStory?.type === "text") {
      setIsMediaReady(true);
      setIsLoading(false);
      if (audioRef.current && !isPaused)
        audioRef.current
          .play()
          .catch((e) => console.log("Autoplay blocked", e));
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex, currentStory]);

  useEffect(() => {
    if (!currentStory || !isMediaReady || isPaused) {
      if (audioRef.current) audioRef.current.pause();
      return;
    } else {
      if (audioRef.current && !isMuted)
        audioRef.current
          .play()
          .catch((e) => console.log("Autoplay blocked", e));
    }

    if (progressInterval.current) clearInterval(progressInterval.current);

    const duration =
      currentStory.mediaType === "video" && videoRef.current
        ? videoRef.current.duration * 1000
        : IMAGE_DURATION;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 100 / (duration / 100);
        if (newProgress >= 100) {
          clearInterval(interval);
          handleNext();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    progressInterval.current = interval;
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [currentStory, isPaused, currentIndex, isMediaReady, isMuted]);

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
        .viewers.filter((id: string) => id !== currentStory.userId);

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
            displayName: userData.displayName || "Anonymous",
            photoURL: userData.photoURL || "",
            lastSeen: userData.lastSeen || { seconds: Date.now() / 1000 },
          };
        }
        return null;
      });

      const results = await Promise.all(viewersPromises);
      setViewersData(results.filter(Boolean));
    } catch (err) {
      console.error(err);
    } finally {
      setViewersLoading(false);
    }
  };

  const togglePlay = () => {
    const newState = !isPaused;
    setIsPaused(newState);

    if (newState) {
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
    } else {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
      if (audioRef.current && !isMuted) {
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !currentStory) return;

    setIsDeleting(true);
    setIsPaused(true);

    try {
      await deleteDoc(doc(db, "stories", currentStory.id));

      if (currentStory.type === "media" && currentStory.mediaUrl) {
        try {
          const mediaRef = ref(storage, currentStory.mediaUrl);
          await deleteObject(mediaRef);
        } catch (storageErr) {
          console.warn(
            "Failed to delete media from storage (might already be gone):",
            storageErr
          );
        }
      }

      toast({ title: "Story deleted successfully" });
      onClose();
    } catch (error) {
      console.error("Error deleting story:", error);
      toast({ variant: "destructive", title: "Failed to delete story" });
      setIsDeleting(false);
      setIsPaused(false);
    }
  };
  useEffect(() => {
    if (showViewers) {
      setIsPaused(true);
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
    }
  }, [showViewers]);

  useEffect(() => {
    if (!currentStory || !currentUser) return;
    const markAsViewed = async () => {
      if (!currentStory.viewers?.includes(currentUser.uid)) {
        await updateDoc(doc(db, "stories", currentStory.id), {
          viewers: arrayUnion(currentUser.uid),
        });
      }
    };
    markAsViewed();
  }, [currentStory, currentUser, db]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (videoRef.current) {
      videoRef.current.muted = newMutedState;
    }
    if (audioRef.current) {
      audioRef.current.volume = newMutedState ? 0 : 0.5;
    }
  };

  const handleMediaLoaded = () => {
    setIsLoading(false);
    setIsMediaReady(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="absolute inset-0 opacity-30 blur-3xl scale-110 z-0 pointer-events-none">
        {currentStory.type === "text" ? (
          <div
            className={`w-full h-full ${
              currentStory.backgroundColor || "bg-gray-900"
            }`}
          />
        ) : (
          <img
            src={currentStory.mediaUrl || "/placeholder.svg"}
            className="w-full h-full object-cover"
            alt="blur-bg"
          />
        )}
      </div>

      <div className="absolute right-4 top-4 z-[9999] flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-white hover:bg-white/10 p-2 rounded-full transition">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-40 bg-zinc-900 text-white border border-zinc-700"
            align="end"
          >
            {currentStory.userId === currentUser?.uid && (
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-500 focus:bg-red-500/20 cursor-pointer"
              >
                Delete Story
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          className="text-white hover:bg-white/10 p-2 rounded-full transition"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <button
        className="absolute left-2 top-1/2 z-50 -translate-y-1/2 text-white p-4 hover:bg-white/5 rounded-full"
        onClick={handlePrevious}
        disabled={currentIndex === 0}
      >
        <ChevronLeft
          className={`h-8 w-8 ${currentIndex === 0 ? "opacity-50" : ""}`}
        />
      </button>
      <button
        className="absolute right-2 top-1/2 z-50 -translate-y-1/2 text-white p-4 hover:bg-white/5 rounded-full"
        onClick={handleNext}
      >
        <ChevronRight className="h-8 w-8" />
      </button>

      <div className="absolute top-2 top left-0 right-0 z-[9999] flex gap-1 px-4">
        {stories.map((story, index) => (
          <div
            key={story.id}
            className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden"
          >
            <div
              className="h-full bg-white transition-all duration-100 ease-linear"
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

      <div className="absolute top-0 left-0 right-0 z-50 px-4 pt-6 pb-3 bg-gradient-to-b from-black/60 via-black/30 to-transparent flex items-center gap-3">
        <UserAvatar
          user={storyUser}
          className="h-10 w-10 border-2 border-primary"
        />
        <div className="text-white">
          <p className="font-medium flex items-center gap-1 text-sm shadow-black drop-shadow-md">
            {storyUser?.uid === currentUser?.uid ? (
              <span className="text-primary">You</span>
            ) : (
              <span>{storyUser?.displayName}</span>
            )}
            {storyUser?.isVerified && !storyUser.isAdmin && (
              <svg
                aria-label="Sudah Diverifikasi"
                fill="rgb(0, 149, 246)"
                height="16"
                role="img"
                viewBox="0 0 40 40"
                width="16"
              >
                <title>Verified</title>
                <path
                  d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                  fillRule="evenodd"
                ></path>
              </svg>
            )}
            {storyUser.isAdmin && (
              <svg
                aria-label="Afiliated Account"
                height="15"
                role="img"
                viewBox="0 0 40 40"
                width="15"
              >
                <defs>
                  <linearGradient
                    id="metallicGold"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stop-color="#fff7b0" />
                    <stop offset="25%" stop-color="#ffd700" />
                    <stop offset="50%" stop-color="#ffa500" />
                    <stop offset="75%" stop-color="#ffd700" />
                    <stop offset="100%" stop-color="#fff7b0" />
                  </linearGradient>
                </defs>
                <title>Afiliated Account</title>
                <path
                  d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                  fill="url(#metallicGold)"
                  fill-rule="evenodd"
                ></path>
              </svg>
            )}
          </p>
          <p className="text-xs opacity-80 drop-shadow-md">
            {formatDistanceToNow(new Date(currentStory.createdAt), {
              addSuffix: true,
            })}
          </p>
          {currentStory.musicTitle && (
            <div className="flex items-center gap-1 text-xs opacity-90 mt-0.5 animate-pulse">
              <Music className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[200px">
                {currentStory.musicTitle}
              </span>
              <span className="shrink-0"> - {currentStory.musicArtist}</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative h-full w-full max-w-md flex items-center justify-center overflow-hidden z-10 shadow md:rounded-xl">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        )}

        {currentStory.type === "text" ? (
          <div
            className={`w-full h-full flex items-center justify-center p-8 text-center ${
              currentStory.backgroundColor || "bg-black"
            }`}
          >
            <p className="text-white text-2xl font-bold break-words whitespace-pre-wrap animate-in fade-in zoom-in duration-500">
              {currentStory.textContent}
            </p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 z-50 
  bg-gradient-to-t from-black/80 via-black/40 to-transparent
  px-4 pt-10 pb-6 flex flex-col items-center gap-4"
      >
        {(currentStory.caption || currentStory.textContent) &&
          currentStory.type !== "text" && (
            <p className="text-center text-white text-base font-roboto px-6 mb-2">
              {currentStory.caption || currentStory.textContent}
            </p>
          )}

        <div className="flex justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
            onClick={() => togglePlay()}
          >
            {isPaused ? (
              <Play className="h-5 w-5" />
            ) : (
              <Pause className="h-5 w-5" />
            )}
          </Button>

          {(currentStory.musicUrl || currentStory.mediaType === "video") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
          )}

          {currentStory.userId === currentUser?.uid && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-black/20 text-white backdrop-blur-sm hover:bg-black/50"
                onClick={() => {
                  setShowViewers(true);
                  fetchViewersData();
                }}
              >
                <Users className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showViewers && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 500 }}
            className="absolute bottom-0 left-0 right-0 z-50 bg-background/95 rounded-t-xl backdrop-blur-md md:max-w-2xl max-w-full mx-auto border-t border-white/10"
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
                      className="p-3 flex items-center gap-3 border-none bg-accent/50"
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
                        <p className="font-medium text-sm">
                          {viewer.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Seen{" "}
                          {formatDistanceToNow(
                            new Date(viewer.lastSeen.seconds * 1000),
                            { addSuffix: true }
                          )}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground p-4 text-sm">
                  No viewers yet
                </p>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Delete Story?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This story will be deleted. This action cannot be undone
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
