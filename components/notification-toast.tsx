"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface NotificationToastProps {
  notifications: Record<string, number>;
  contactMap: Record<string, string>;
  onClear: (userId: string) => void;
}

export default function NotificationToast({
  notifications,
  contactMap,
  onClear,
}: NotificationToastProps) {
  useEffect(() => {
    const timers = Object.keys(notifications).map((userId) => {
      return setTimeout(() => {
        onClear(userId);
      }, 5000);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [notifications, onClear]);

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {Object.entries(notifications).map(([userId, count]) => (
        <div
          key={userId}
          className="bg-white dark:bg-muted border dark:border-gray-700 shadow-lg rounded-lg px-4 py-2 flex items-center justify-between w-64 animate-slide-in"
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800 dark:text-white">
              {contactMap[userId] || "Someone"} sended you{" "}
              {count == 1 ? "a" : count} new message
            </p>
          </div>
          <button onClick={() => onClear(userId)} className="ml-2">
            <X className="h-4 w-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" />
          </button>
        </div>
      ))}
    </div>
  );
}
