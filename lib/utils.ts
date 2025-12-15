import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { db } from "./firebase";
import type { Message } from "@/types/message";

const tzMap: Record<string, string> = {
  "Asia/Jakarta": "Jakarta Time",
  "Asia/Bangkok": "Indochina Time",
  "Asia/Singapore": "Singapore Time",
  "Asia/Kuala_Lumpur": "Malaysia Time",
  "Asia/Manila": "Philippines Time",
  "Asia/Tokyo": "Japan Standard Time",
  "Asia/Seoul": "Korea Standard Time",
  "Asia/Shanghai": "China Standard Time",
  "Asia/Hong_Kong": "Hong Kong Time",
  "Asia/Dubai": "Gulf Standard Time",
  "Asia/Kolkata": "India Standard Time",
  "Europe/London": "British Time",
  "Europe/Paris": "Central European Time",
  "Europe/Berlin": "Central European Time",
  "America/New_York": "Eastern Time",
  "America/Chicago": "Central Time",
  "America/Denver": "Mountain Time",
  "America/Los_Angeles": "Pacific Time",
  "America/Sao_Paulo": "Brasilia Time",
  "Australia/Sydney": "Australian Eastern Time",
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getRoleClaims = (claims: any) => {
  return {
    isAdmin: claims?.admin === true,
    isSuperAdmin: claims?.superAdmin === true,
  };
};

export function formatTimestamp(
  timestamp: number,
  timeZone: string = "Asia/Jakarta"
) {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone,
  });
  const tzLabel = tzMap[timeZone] ?? timeZone;
  return `${formatter.format(date)} (${tzLabel})`;
}

export function formatDateLabel(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const diff = now.getTime() - date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const isToday = diff < dayMs && date.getDate() === now.getDate();
  const isYesterday = diff < dayMs * 2 && date.getDate() === now.getDate() - 1;

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
    });
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatAccuracy(acc: number) {
  if (!acc) return "Unavailable";

  if (acc < 1000) return `${Math.round(acc)} m`;

  if (acc < 1000000) return `${(acc / 1000).toFixed(1)} km`;

  return `${Math.round(acc / 1000)} km`;
}

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export const EXTENDED_REACTIONS = [
  "👍",
  "👎",
  "❤️",
  "💔",
  "😂",
  "🤣",
  "🥹",
  "😇",
  "🙂",
  "🙃",
  "😉",
  "😍",
  "🥰",
  "😘",
  "😋",
  "😛",
  "🤔",
  "🫡",
  "🤨",
  "😐",
  "😑",
  "😶",
  "🙄",
  "😏",
  "😣",
  "😥",
  "😮",
  "😯",
  "😪",
  "😫",
  "🥱",
  "😴",
  "😌",
  "😛",
  "😜",
  "😝",
  "🤤",
  "😒",
  "😓",
  "😔",
  "😕",
  "🫤",
  "🙃",
  "🫠",
  "🤑",
  "😲",
  "☹️",
  "🙁",
  "😖",
  "😞",
  "😟",
  "😤",
  "😢",
  "😭",
  "😦",
  "😧",
  "😨",
  "😩",
  "🤯",
  "😬",
  "😮‍💨",
  "😰",
  "😱",
  "🥵",
  "🥶",
  "😳",
  "🤪",
  "😵",
  "🥴",
  "😠",
  "😡",
  "🤬",
  "😷",
  "🤒",
  "🤕",
  "🤢",
  "🤮",
  "🤧",
  "🥳",
  "🥴",
  "🥺",
  "🤠",
  "🤡",
  "🤥",
  "🤫",
  "🤭",
  "🫣",
  "🧐",
  "🤓",
  "😈",
  "👿",
  "👹",
  "👺",
  "💀",
  "☠️",
  "👻",
  "👽",
  "👾",
  "🤖",
  "💩",
  "🔥",
  "✨",
  "🌟",
  "💫",
  "💥",
  "💯",
  "💢",
  "🙏",
  "🤝",
  "👀",
];

export const toggleReaction = async (
  message: Message,
  userId: string,
  emoji: string
) => {
  if (!message.id || !userId) return;

  const messageRef = doc(db, "messages", message.id);

  const currentReactions = message.reactions || {};
  const usersWhoReacted = currentReactions[emoji] || [];
  const hasReacted = usersWhoReacted.includes(userId);

  try {
    if (hasReacted) {
      await updateDoc(messageRef, {
        [`reactions.${emoji}`]: arrayRemove(userId),
      });
    } else {
      await updateDoc(messageRef, {
        [`reactions.${emoji}`]: arrayUnion(userId),
      });
    }
  } catch (error) {
    console.error("Error updating reaction:", error);
    throw error;
  }
};

export const getReactionCount = (
  reactions: Record<string, string[]> | undefined
) => {
  if (!reactions) return 0;
  return Object.values(reactions).reduce((acc, curr) => acc + curr.length, 0);
};

// just plan
export const getMemberColor = (userId: string) => {
  const colors = [
    "text-red-500 dark:text-red-400",
    "text-orange-500 dark:text-orange-400",
    "text-amber-500 dark:text-amber-400",
    "text-green-500 dark:text-green-400",
    "text-emerald-500 dark:text-emerald-400",
    "text-teal-500 dark:text-teal-400",
    "text-cyan-500 dark:text-cyan-400",
    "text-blue-500 dark:text-blue-400",
    "text-indigo-500 dark:text-indigo-400",
    "text-violet-500 dark:text-violet-400",
    "text-purple-500 dark:text-purple-400",
    "text-fuchsia-500 dark:text-fuchsia-400",
    "text-pink-500 dark:text-pink-400",
    "text-rose-500 dark:text-rose-400",
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash % colors.length);
  return colors[index];
};
