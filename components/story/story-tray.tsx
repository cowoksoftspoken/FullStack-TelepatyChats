"use client";

import { useState, useMemo, useCallback } from "react";
import { StoryCircle } from "./story-circle";
import { StoryViewer } from "./story-viewer";
import type { User } from "@/types/user";
import type { Story } from "@/types/story";
import useUserStatus from "@/hooks/use-user-status";

interface StoryTrayProps {
  users: User[];
  currentUser: User | null;
  hasStory: boolean;
}

function StoryTrayItem({
  user,
  currentUser,
  onStoriesLoaded,
  onClick,
}: {
  user: User;
  currentUser: User | null;
  onStoriesLoaded: (userId: string, stories: Story[]) => void;
  onClick: () => void;
}) {
  const { isBlocked, isUserBlockedByContact } = useUserStatus(
    user.uid,
    currentUser?.uid
  );

  if (isBlocked || isUserBlockedByContact) return null;

  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <StoryCircle
        user={user}
        currentUser={currentUser}
        onStoriesLoaded={onStoriesLoaded}
        onClick={onClick}
      />
      <span className="mt-1 text-xs max-w-[100px] truncate inline-block">
        {user.displayName}
      </span>
    </div>
  );
}

export function StoryTray({ users, currentUser, hasStory }: StoryTrayProps) {
  const [storiesMap, setStoriesMap] = useState<Record<string, Story[]>>({});
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  const handleStoriesLoaded = useCallback(
    (userId: string, stories: Story[]) => {
      setStoriesMap((prev) => {
        if (JSON.stringify(prev[userId]) === JSON.stringify(stories))
          return prev;
        return { ...prev, [userId]: stories };
      });
    },
    []
  );

  const usersWithStories = useMemo(() => {
    return users.filter(
      (user) => storiesMap[user.uid] && storiesMap[user.uid].length > 0
    );
  }, [users, storiesMap]);

  const handleNextUser = () => {
    if (!activeUserId) return;
    const currentIndex = usersWithStories.findIndex(
      (u) => u.uid === activeUserId
    );

    if (currentIndex !== -1 && currentIndex < usersWithStories.length - 1) {
      setActiveUserId(usersWithStories[currentIndex + 1].uid);
    } else {
      setActiveUserId(null);
    }
  };

  const handlePrevUser = () => {
    if (!activeUserId) return;
    const currentIndex = usersWithStories.findIndex(
      (u) => u.uid === activeUserId
    );

    if (currentIndex > 0) {
      setActiveUserId(usersWithStories[currentIndex - 1].uid);
    }
  };

  const usersRecord = useMemo(() => {
    const record: Record<string, User> = {};
    users.forEach((u) => (record[u.uid] = u));
    if (currentUser) {
      record[currentUser.uid] = currentUser;
    }
    return record;
  }, [users, currentUser]);

  return (
    <>
      <div className="flex gap-4 items-center">
        {currentUser && hasStory && (
          <div className="flex flex-col items-center flex-shrink-0">
            <StoryCircle
              key={currentUser.uid}
              user={currentUser}
              currentUser={currentUser}
              onStoriesLoaded={handleStoriesLoaded}
              onClick={() => setActiveUserId(currentUser.uid)}
            />
            <span className="mt-1 text-xs max-w-[100px] truncate inline-block">
              You
            </span>
          </div>
        )}

        {users
          .filter((u) => u.uid !== currentUser?.uid)
          .map((user) => (
            <StoryTrayItem
              key={user.uid}
              user={user}
              currentUser={currentUser}
              onStoriesLoaded={handleStoriesLoaded}
              onClick={() => setActiveUserId(user.uid)}
            />
          ))}
      </div>

      {activeUserId && storiesMap[activeUserId] && (
        <StoryViewer
          stories={storiesMap[activeUserId]}
          users={usersRecord}
          onClose={() => setActiveUserId(null)}
          onNextUser={handleNextUser}
          onPrevUser={handlePrevUser}
          initialStoryIndex={0}
        />
      )}
    </>
  );
}
