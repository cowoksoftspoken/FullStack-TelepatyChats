"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useConnectionStats } from "@/hooks/use-webrtc-enhanced";
import type { User } from "@/types/user";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart2,
  ChartLine,
  Lock,
  Mic,
  MicOff,
  Minimize,
  Monitor,
  PhoneOff,
  RotateCw,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ConnectionStatsPanel from "./connection-stats-panel";
import { UserAvatar } from "./user-avatar";

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
  shareScreen: () => void;
  switchCamera: () => void;
  // new
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
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
  shareScreen,
  switchCamera,
  isMinimized,
  setIsMinimized,
}: EnhancedCallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isRemoteAudioEnabled, setIsRemoteAudioEnabled] = useState(true);
  const [isLocalMain, setIsLocalMain] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const stats = useConnectionStats();
  const [hasTwoCameras, setHasTwoCameras] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => setCallDuration((p) => p + 1), 1000);
    } else setCallDuration(0);
    return () => interval && clearInterval(interval);
  }, [isConnected]);

  useEffect(() => {
    const checkCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setHasTwoCameras(videoInputs.length > 1);
      } catch {
        setHasTwoCameras(false);
      }
    };
    checkCameras();
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec
      .toString()
      .padStart(2, "0")}`;
  };

  const getStatus = () => {
    if (isConnected) return { text: "Connected", color: "bg-green-500" };
    if (connectionState === "connecting" || iceConnectionState === "checking")
      return { text: "Connecting...", color: "bg-yellow-500" };
    if (connectionState === "failed" || iceConnectionState === "failed")
      return { text: "Connection Failed", color: "bg-red-500" };
    return { text: "Waiting to be Answered", color: "bg-gray-500" };
  };

  const canShare =
    !/Mobi|Android|iPhone|iPod/i.test(navigator.userAgent) &&
    !!navigator.mediaDevices?.getDisplayMedia;

  useEffect(() => {
    if (!localStream && !remoteStream) return;
    if (isLocalMain) {
      if (remoteVideoRef.current)
        remoteVideoRef.current.srcObject = localStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = remoteStream;
    } else {
      if (remoteVideoRef.current)
        remoteVideoRef.current.srcObject = remoteStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    }
  }, [isLocalMain, localStream, remoteStream, isMinimized]);

  const status = getStatus();

  if (isMinimized && isActive) {
    return (
      <motion.div
        drag
        dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
        dragElastic={0.2}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed bottom-6 right-6 z-50 cursor-pointer select-none"
        onClick={() => setIsMinimized(false)}
      >
        {isVideo ? (
          <div className="relative w-52 h-36 rounded-2xl overflow-hidden shadow-xl border border-white/10 bg-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={!isRemoteAudioEnabled}
              className="w-full h-full object-cover bg-black"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-transparent" />

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            <div
              className={`absolute top-2 left-2 flex items-center gap-2 ${status.color}/30 rounded-full text-xs text-white`}
            >
              <UserAvatar user={contact} size="sm" />
              <div>
                <p className="text-xs text-white font-semibold drop-shadow flex items-center gap-1">
                  {contact.displayName}
                  {contact?.isVerified && !contact?.isAdmin && (
                    <svg
                      aria-label="Verified"
                      fill="rgb(0, 149, 246)"
                      height="12"
                      role="img"
                      viewBox="0 0 40 40"
                      width="12"
                    >
                      <title>Verified</title>
                      <path
                        d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                        fillRule="evenodd"
                      ></path>
                    </svg>
                  )}
                  {contact?.isAdmin && (
                    <svg
                      aria-label="Afiliated Account"
                      height="12"
                      width="12"
                      role="img"
                      viewBox="0 0 40 40"
                    >
                      <defs>
                        <linearGradient
                          id="metallicGold-verified-icon-call"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop offset="0%" stopColor="#fff7b0" />
                          <stop offset="25%" stopColor="#ffd700" />
                          <stop offset="50%" stopColor="#ffa500" />
                          <stop offset="75%" stopColor="#ffd700" />
                          <stop offset="100%" stopColor="#fff7b0" />
                        </linearGradient>
                      </defs>
                      <title>Affiliated Account</title>
                      <path
                        d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                        fill="url(#metallicGold-verified-icon-call)"
                        fillRule="evenodd"
                      />
                    </svg>
                  )}
                </p>
                <p className="text-white/80 text-xs drop-shadow">
                  {isConnected ? formatDuration(callDuration) : status.text}
                </p>
              </div>
            </div>

            <div className="absolute bottom-2 right-2 flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 border border-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(false);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4h7M4 4v7M4 4l6 6M20 20h-7m7 0v-7m0 7l-6-6"
                  />
                </svg>
              </Button>

              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8 z-20 rounded-full bg-red-600/90 hover:bg-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onEndCall();
                  setIsMinimized(false);
                }}
              >
                <PhoneOff className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-white/10 backdrop-blur-md min-w-[200px]">
            <UserAvatar user={contact} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-semibold flex items-center gap-1">
                {contact.displayName}
                {contact?.isVerified && !contact?.isAdmin && (
                  <svg
                    aria-label="Verified"
                    fill="rgb(0, 149, 246)"
                    height="12"
                    role="img"
                    viewBox="0 0 40 40"
                    width="12"
                  >
                    <title>Verified</title>
                    <path
                      d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                      fillRule="evenodd"
                    ></path>
                  </svg>
                )}
                {contact?.isAdmin && (
                  <svg
                    aria-label="Afiliated Account"
                    height="12"
                    width="12"
                    role="img"
                    viewBox="0 0 40 40"
                  >
                    <defs>
                      <linearGradient
                        id="metallicGold-verified-icon-call"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0%" stopColor="#fff7b0" />
                        <stop offset="25%" stopColor="#ffd700" />
                        <stop offset="50%" stopColor="#ffa500" />
                        <stop offset="75%" stopColor="#ffd700" />
                        <stop offset="100%" stopColor="#fff7b0" />
                      </linearGradient>
                    </defs>
                    <title>Affiliated Account</title>
                    <path
                      d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                      fill="url(#metallicGold-verified-icon-call)"
                      fillRule="evenodd"
                    />
                  </svg>
                )}
              </p>
              <p className="text-xs text-gray-300">
                {isConnected ? formatDuration(callDuration) : status.text}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="hover:bg-red-600/20"
              onClick={(e) => {
                e.stopPropagation();
                onEndCall();
                setIsMinimized(false);
              }}
            >
              <PhoneOff className="text-red-500 h-5 w-5" />
            </Button>

            {remoteStream && (
              <audio
                autoPlay
                playsInline
                ref={(el) => {
                  if (el) el.srcObject = remoteStream;
                }}
                muted={!isRemoteAudioEnabled}
                className="hidden"
              />
            )}
          </div>
        )}
      </motion.div>
    );
  }

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 ${
          isVideo ? "bg-transparent" : "bg-black/90"
        } backdrop-blur-sm`}
      >
        <div className="flex h-full flex-col">
          <div
            className={`flex items-center justify-between p-4 ${
              isVideo
                ? "bg-transparent absolute w-full top-0 z-50"
                : "bg-black/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <UserAvatar user={contact} size="md" />
              <div className="block">
                <h3 className="text-white font-medium flex items-center mb-1 gap-1">
                  <span className="text-glow">
                    {contact ? contact.displayName : "Unknown User"}
                  </span>
                  {contact?.isVerified && !contact?.isAdmin && (
                    <svg
                      aria-label="Verified"
                      fill="rgb(0, 149, 246)"
                      height="15"
                      role="img"
                      viewBox="0 0 40 40"
                      width="15"
                    >
                      <title>Verified</title>
                      <path
                        d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                        fillRule="evenodd"
                      ></path>
                    </svg>
                  )}
                  {contact?.isAdmin && (
                    <svg
                      aria-label="Afiliated Account"
                      height="15"
                      width="15"
                      role="img"
                      viewBox="0 0 40 40"
                    >
                      <defs>
                        <linearGradient
                          id="metallicGold-verified-icon-call"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop offset="0%" stopColor="#fff7b0" />
                          <stop offset="25%" stopColor="#ffd700" />
                          <stop offset="50%" stopColor="#ffa500" />
                          <stop offset="75%" stopColor="#ffd700" />
                          <stop offset="100%" stopColor="#fff7b0" />
                        </linearGradient>
                      </defs>
                      <title>Affiliated Account</title>
                      <path
                        d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"
                        fill="url(#metallicGold-verified-icon-call)"
                        fillRule="evenodd"
                      />
                    </svg>
                  )}
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

            <style jsx>
              {`
                .text-glow {
                  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
                }
              `}
            </style>

            <div className="flex bg-black/30 items-center rounded-full">
              <div
                className="rounded-full p-3 hover:bg-white/10 cursor-default"
                title="Secure Call (E2E Encrypted)"
              >
                <Lock className="h-[1.1rem] w-[1.1rem] text-green-600" />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-white/10"
                onClick={() => setIsMinimized(true)}
              >
                <Minimize className="h-5 w-5 text-white" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-white/10"
                onClick={() => setShowStats(!showStats)}
              >
                <BarChart2 className="h-5 w-5 text-white" />
              </Button>
            </div>
          </div>

          {showStats && (
            <ConnectionStatsPanel stats={stats} setShowStats={setShowStats} />
          )}

          <div className="flex-1 relative">
            {isVideo ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  muted={!isRemoteAudioEnabled}
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover bg-black"
                />
                {!isVideoEnabled && isLocalMain && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <VideoOff className="h-10 w-10 text-white" />
                  </div>
                )}

                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 via-black/30 to-transparent z-10 pointer-events-none" />

                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />

                <Card
                  className="absolute top-[6rem] right-4 w-48 h-36 overflow-hidden"
                  onClick={() => setIsLocalMain(!isLocalMain)}
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover cursor-pointer"
                  />
                  {!isVideoEnabled && !isLocalMain && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                      <VideoOff className="h-8 w-8 text-white" />
                    </div>
                  )}
                </Card>
                {!remoteStream && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
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
                  <div className="w-32 h-32 mx-auto px-4 mb-2">
                    <UserAvatar user={contact} size="lg" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    {contact.displayName}
                  </h2>
                  <p className="text-white/70">
                    {isConnected ? formatDuration(callDuration) : status.text}
                  </p>
                </div>
                {remoteStream && (
                  <audio
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el) el.srcObject = remoteStream;
                    }}
                    muted={!isRemoteAudioEnabled}
                    className="hidden"
                  ></audio>
                )}
              </div>
            )}
          </div>

          <div
            className={`p-4 sm:p-6 ${
              isVideo
                ? "bg-transparent absolute bottom-3 left-0 right-0 z-50"
                : "bg-black/50"
            }`}
          >
            <div className="max-w-[92%] sm:max-w-md mx-auto">
              <div className="flex items-center justify-center gap-3 sm:gap-5">
                <Button
                  variant={isMuted ? "destructive" : "secondary"}
                  className="rounded-full h-14 w-14 sm:h-16 sm:w-16"
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
                    className="rounded-full h-14 w-14 sm:h-16 sm:w-16"
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
                  className="rounded-full h-16 w-16"
                  onClick={() => {
                    onEndCall();
                    setIsLocalMain(false);
                    setIsMinimized(false);
                  }}
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>

                <Button
                  variant="secondary"
                  className="rounded-full h-14 w-14"
                  onClick={() => setIsRemoteAudioEnabled(!isRemoteAudioEnabled)}
                >
                  {isRemoteAudioEnabled ? (
                    <Volume2 className="h-6 w-6" />
                  ) : (
                    <VolumeX className="h-6 w-6" />
                  )}
                </Button>

                {hasTwoCameras && isVideo && (
                  <Button
                    variant="secondary"
                    className="rounded-full h-14 w-14"
                    onClick={switchCamera}
                  >
                    <RotateCw className="h-6 w-6" />
                  </Button>
                )}

                {isVideo && canShare && (
                  <Button
                    variant="secondary"
                    className="rounded-full h-14 w-14"
                    onClick={() => {
                      if (canShare) shareScreen();
                      else
                        toast({
                          title: "Error",
                          description:
                            "Share Screen not supported on mobile devices",
                        });
                    }}
                  >
                    <Monitor className="h-6 w-6" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
