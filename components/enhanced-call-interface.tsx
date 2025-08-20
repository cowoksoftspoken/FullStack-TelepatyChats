"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "./user-avatar";
import type { User } from "@/types/user";

interface EnhancedCallInterfaceProps {
  isActive: boolean;
  isConnected: boolean;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  isVideo: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  contact: User;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

export function EnhancedCallInterface({
  isActive,
  isConnected,
  connectionState,
  iceConnectionState,
  isVideo,
  isMuted,
  isVideoEnabled,
  contact,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}: EnhancedCallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isRemoteAudioEnabled, setIsRemoteAudioEnabled] = useState(true);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      console.log("📺 Local video stream attached");
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      console.log("📺 Remote video stream attached");
    }
  }, [remoteStream]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getConnectionStatus = () => {
    if (isConnected) {
      return { text: "Connected", color: "bg-green-500" };
    } else if (
      connectionState === "connecting" ||
      iceConnectionState === "checking"
    ) {
      return { text: "Connecting...", color: "bg-yellow-500" };
    } else if (
      connectionState === "failed" ||
      iceConnectionState === "failed"
    ) {
      return { text: "Connection Failed", color: "bg-red-500" };
    } else {
      console.warn(
        "Unknown connection state:",
        connectionState,
        iceConnectionState
      );
      return {
        text: isConnected ? "Connected" : "Disconnected",
        color: "bg-gray-500",
      };
    }
  };

  const status = getConnectionStatus();

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-4 bg-black/50">
            <div className="flex items-center gap-3">
              <UserAvatar user={contact} size="sm" />
              <div>
                <h3 className="text-white font-medium">
                  {contact.displayName}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={`${status.color} text-white text-xs`}
                  >
                    {status.text}
                  </Badge>
                  {isConnected && (
                    <span className="text-white text-xs">
                      {formatDuration(callDuration)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-white/70">
              <div>Connection: {connectionState}</div>
              <div>Local Straming: {localStream ? "Accepted" : "❌"}</div>
              <div>Remote Streaming: {remoteStream ? "Accepted" : "❌"}</div>
            </div>
          </div>

          <div className="flex-1 relative">
            {isVideo ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover md:object-contain bg-black"
                  onLoadedMetadata={() => console.log("📺 Remote video loaded")}
                  onError={(e) => console.error("❌ Remote video error:", e)}
                />

                <Card className="absolute top-4 right-4 w-48 h-36 overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    onLoadedMetadata={() =>
                      console.log("📺 Local video loaded")
                    }
                    onError={(e) => console.error("❌ Local video error:", e)}
                  />
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                      <VideoOff className="h-8 w-8 text-white" />
                    </div>
                  )}
                </Card>

                {!remoteStream && (
                  <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="w-24 h-24 mx-auto mb-4">
                        <UserAvatar user={contact} size="lg" />
                      </div>
                      <p>Waiting for {contact.displayName}'s video...</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-6">
                    <UserAvatar user={contact} size="lg" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    {contact.displayName}
                  </h2>
                  <p className="text-white/70">
                    {isConnected
                      ? `${formatDuration(callDuration)}`
                      : status.text}
                  </p>
                </div>
              </div>
            )}

            {!isConnected && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Card className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-white">{status.text}</p>
                  <div className="text-xs text-white/70 mt-2">
                    <div>Connection State: {connectionState}</div>
                    <div>ICE State: {iceConnectionState}</div>
                    <div>
                      Streams: L:{localStream ? "✅" : "❌"} R:
                      {remoteStream ? "✅" : "❌"}
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          <div className="p-6 bg-black/50">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="lg"
                className="rounded-full h-14 w-14"
                onClick={onToggleMute}
              >
                {isMuted ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>

              {isVideo && (
                <Button
                  variant={isVideoEnabled ? "secondary" : "destructive"}
                  size="lg"
                  className="rounded-full h-14 w-14"
                  onClick={onToggleVideo}
                >
                  {isVideoEnabled ? (
                    <Video className="h-6 w-6" />
                  ) : (
                    <VideoOff className="h-6 w-6" />
                  )}
                </Button>
              )}

              <Button
                variant="destructive"
                size="lg"
                className="rounded-full h-16 w-16"
                onClick={onEndCall}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>

              <Button
                variant="secondary"
                size="lg"
                className="rounded-full h-14 w-14"
                onClick={() => setIsRemoteAudioEnabled(!isRemoteAudioEnabled)}
              >
                {isRemoteAudioEnabled ? (
                  <Volume2 className="h-6 w-6" />
                ) : (
                  <VolumeX className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
