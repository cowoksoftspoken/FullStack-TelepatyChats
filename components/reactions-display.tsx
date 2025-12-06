"use client";

import { Message } from "@/types/message";
import { cn } from "@/lib/utils";
import { toggleReaction } from "@/lib/utils";

interface ReactionDisplayProps {
  message: Message;
  currentUserUid: string;
}

export function ReactionDisplay({
  message,
  currentUserUid,
}: ReactionDisplayProps) {
  const reactions = message.reactions || {};
  const hasReactions =
    Object.keys(reactions).length > 0 &&
    Object.values(reactions).some((arr) => arr.length > 0);

  if (!hasReactions) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 mt-1 z-20 relative",
        message.senderId === currentUserUid ? "justify-end" : "justify-start"
      )}
    >
      {Object.entries(reactions).map(([emoji, userIds]) => {
        if (!userIds || userIds.length === 0) return null;

        const isMe = userIds.includes(currentUserUid);

        return (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              toggleReaction(message, currentUserUid, emoji);
            }}
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] md:text-xs border transition-all animate-in zoom-in duration-200",
              isMe
                ? "bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/50 dark:border-indigo-700 dark:text-indigo-200"
                : "bg-gray-100 border-gray-200 text-gray-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-300 hover:bg-gray-200"
            )}
          >
            <span>{emoji}</span>
            <span className="font-medium">{userIds.length}</span>
          </button>
        );
      })}
    </div>
  );
}
