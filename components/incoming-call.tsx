"use client";

import { EnhancedIncomingCall } from "./enhanced-incoming-call";
import type { User } from "@/types/user";

interface IncomingCallProps {
  caller: User;
  isVideo: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCall({
  caller,
  isVideo,
  onAccept,
  onReject,
}: IncomingCallProps) {
  return (
    <EnhancedIncomingCall
      caller={caller}
      isVideo={isVideo}
      onAccept={onAccept}
      onReject={onReject}
    />
  );
}
