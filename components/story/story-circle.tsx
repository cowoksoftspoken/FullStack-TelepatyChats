"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StoryViewer } from "./story-viewer";
import { useFirebase } from "@/lib/firebase-provider";
import type { Story } from "@/types/story";
import type { User } from "@/types/user";

interface StoryCircleProps {
  user: User;
  currentUser: User | null;
  size?: "sm" | "md" | "lg";
}

export function StoryCircle({
  user,
  currentUser,
  size = "md",
}: StoryCircleProps) {
  const { db } = useFirebase();
  const [hasStories, setHasStories] = useState(false);
  const [hasUnseenStories, setHasUnseenStories] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [users, setUsers] = useState<Record<string, User>>({});

  // Fetch stories for this user
  useEffect(() => {
    const fetchStories = async () => {
      if (!user.uid) return;

      try {
        // Get current time
        const now = new Date();

        // Get stories that haven't expired yet
        const q = query(
          collection(db, "stories"),
          where("userId", "==", user.uid),
          where("expiresAt", ">", now.toISOString()),
          orderBy("expiresAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const storiesData: Story[] = [];

        querySnapshot.forEach((doc) => {
          storiesData.push({ id: doc.id, ...doc.data() } as Story);
        });

        setStories(storiesData);
        setHasStories(storiesData.length > 0);

        // Check if current user has unseen stories
        if (currentUser && storiesData.length > 0) {
          const hasUnseen = storiesData.some(
            (story) => !story.viewers.includes(currentUser.uid)
          );
          setHasUnseenStories(hasUnseen);
        }
      } catch (error) {
        console.error("Error fetching stories:", error);
      }
    };

    fetchStories();
  }, [user.uid, db, currentUser]);

  // Prepare users data for story viewer
  useEffect(() => {
    if (stories.length > 0) {
      const usersData: Record<string, User> = {};
      usersData[user.uid] = user;
      setUsers(usersData);
    }
  }, [stories, user]);

  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-20 w-20",
  };

  const ringClasses = hasUnseenStories
    ? "ring-2 ring-primary"
    : hasStories
    ? "ring-2 ring-gray-300"
    : "";

  if (!hasStories) return null;

  return (
    <>
      <div
        className={`relative cursor-pointer ${sizeClasses[size]} rounded-full ${ringClasses} p-[2px]`}
        onClick={() => setIsViewerOpen(true)}
      >
        <Avatar className="h-full w-full">
          <AvatarImage
            src={user.photoURL || ""}
            alt={user.displayName}
            className="object-cover"
          />
          <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>

      {isViewerOpen && (
        <StoryViewer
          stories={stories}
          onClose={() => setIsViewerOpen(false)}
          users={users}
        />
      )}
    </>
  );
}
