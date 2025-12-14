import styles from "@/styles/status.module.css";

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
  onlineStatus,
  contactIsTyping,
  isAdmin,
  lastSeen,
  isVerified,
}) => {
  if (isBlocked) {
    return <span>You cannot interact with this user</span>;
  }

  if (contactIsTyping && onlineStatus) {
    return <span>Typing...</span>;
  }

  if (onlineStatus) {
    return <span>Online</span>;
  }

  if (isAdmin) {
    return <span className={styles.role}>Developer Telepaty</span>;
  }

  if (isVerified && !isAdmin) {
    return <span className={styles.verified}>Verified Account</span>;
  }

  return <span className={styles.lastseen}>{formatLastSeen(lastSeen)}</span>;
};

export default ContactStatus;
