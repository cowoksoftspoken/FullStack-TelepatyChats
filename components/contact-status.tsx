"use client";
import React, { useEffect, useMemo, useState } from "react";

type Timestamp = {
  seconds: number;
  nanoseconds?: number;
};

type Contact = {
  online: boolean;
  lastSeen?: Timestamp;
};

type Props = {
  isBlocked: boolean;
  contact: Contact;
  onlineStatus?: boolean;
  contactIsTyping: boolean;
  isAdmin?: boolean;
  lastSeen: number;
  isVerified?: boolean;
};

function formatLastSeen(lastSeen?: number): string {
  if (!lastSeen) return "Offline";

  const date = new Date(lastSeen);
  const now = new Date();

  const lastSeenDay = date.toDateString();
  const nowDay = now.toDateString();

  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  const timeStr = date.toLocaleTimeString("en-US", options);

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (lastSeenDay === nowDay) {
    return `Last seen today at ${timeStr}`;
  } else if (lastSeenDay === yesterday.toDateString()) {
    return `Last seen yesterday at ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `Last seen on ${dateStr} at ${timeStr}`;
  }
}

const ContactStatus: React.FC<Props> = ({
  isBlocked,
  contact,
  onlineStatus,
  contactIsTyping,
  isAdmin,
  lastSeen,
  isVerified,
}) => {
  const [statusIndex, setStatusIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const offlineStatuses = useMemo(() => {
    const list: { text: string; type: "role" | "verified" | "lastSeen" }[] = [];

    if (isVerified && isAdmin) {
      list.push({ text: "Developer Telepaty", type: "role" });
    }

    if (isVerified) {
      list.push({ text: "Verified Account", type: "verified" });
    }

    list.push({
      text: formatLastSeen(lastSeen),
      type: "lastSeen",
    });

    return list;
  }, [isVerified, isAdmin, lastSeen]);

  useEffect(() => {
    if (onlineStatus || contactIsTyping) return;
    if (offlineStatuses.length <= 1) return;

    setStatusIndex(0);

    const interval = setInterval(() => {
      setVisible(false);

      setTimeout(() => {
        setStatusIndex((i) => (i + 1) % offlineStatuses.length);
        setVisible(true);
      }, 250);
    }, 8000);

    return () => clearInterval(interval);
  }, [onlineStatus, contactIsTyping, offlineStatuses]);

  const status = offlineStatuses[statusIndex];

  if (isBlocked) {
    return <span>You cannot interact with this user</span>;
  }

  if (contactIsTyping && onlineStatus) {
    return <span>Typing...</span>;
  }

  if (onlineStatus) {
    return <span>Online</span>;
  }

  return (
    <span
      className={`inline-block transition-all duration-300 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
      } ${
        status.type === "role"
          ? "text-purple-500"
          : status.type === "verified"
          ? "text-blue-500"
          : "text-muted-foreground"
      }`}
    >
      {status.text}
    </span>
  );
};

export default ContactStatus;
