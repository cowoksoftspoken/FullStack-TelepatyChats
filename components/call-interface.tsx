"use client"
import type { User } from "@/types/user"
import { EnhancedCallInterface } from "./enhanced-call-interface"

interface CallInterfaceProps {
  isVideo: boolean
  remoteStream: MediaStream | null
  localStream: MediaStream | null
  contact: User | null
  endCall: () => void
  toggleMute: () => void
  toggleVideo: () => void
}

export function CallInterface({
  isVideo,
  remoteStream,
  localStream,
  contact,
  endCall,
  toggleMute,
  toggleVideo,
}: CallInterfaceProps) {
  if (!contact) return null

  return (
    <EnhancedCallInterface
      isActive={true}
      isConnected={!!remoteStream}
      connectionState="connected"
      iceConnectionState="connected"
      isVideo={isVideo}
      isMuted={false}
      isVideoEnabled={true}
      contact={contact}
      localStream={localStream}
      remoteStream={remoteStream}
      onEndCall={endCall}
      onToggleMute={toggleMute}
      onToggleVideo={toggleVideo}
    />
  )
}
