import React from "react";

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
  contactIsTyping: boolean;
};

function formatLastSeen(timestamp?: Timestamp): string {
  if (!timestamp || !timestamp.seconds) return "Offline";

  const date = new Date(
    timestamp.seconds * 1000 +
      Math.floor((timestamp.nanoseconds || 0) / 1_000_000)
  );
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
  contactIsTyping,
}) => {
  if (isBlocked) {
    return <span>You cannot interact with this user</span>;
  }

  if (contactIsTyping && contact.online) {
    return <span>Typing...</span>;
  }

  if (contact.online) {
    return <span>Online</span>;
  }

  return <span>{formatLastSeen(contact.lastSeen)}</span>;
};

export default ContactStatus;
