"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useFirebase } from "@/lib/firebase-provider";
import { useToast } from "@/hooks/use-toast";
import { initializeWebRTC, getWebRTCManager } from "@/lib/webrtc-native";

interface CallData {
  callId: string;
  from: string;
  isVideo: boolean;
  timestamp: string;
}

interface UseWebRTCEnhancedProps {
  currentUser: any;
  onIncomingCall: (callData: CallData | null) => void;
  onCallEnded: () => void;
  onRemoteStream: (stream: MediaStream) => void;
  onLocalStream: (stream: MediaStream) => void;
}

export function useWebRTCEnhanced({
  currentUser,
  onIncomingCall,
  onCallEnded,
  onRemoteStream,
  onLocalStream,
}: UseWebRTCEnhancedProps) {
  const { db } = useFirebase();
  const { toast } = useToast();

  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] =
    useState<RTCPeerConnectionState>("new");
  const [iceConnectionState, setIceConnectionState] =
    useState<RTCIceConnectionState>("new");
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const webrtcManagerRef = useRef<any>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!currentUser || !db) return;

    console.log("Initializing WebRTC manager...");
    webrtcManagerRef.current = initializeWebRTC(db, currentUser.uid);

    const unsubscribe = webrtcManagerRef.current.listenForIncomingCalls(
      (callData: CallData | null) => {
        if (callData) {
          onIncomingCall(callData);
        } else {
          onIncomingCall(null);
        }
      }
    );
    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [currentUser, db, onIncomingCall]);

  useEffect(() => {
    const handleLocalStream = (event: any) => {
      console.log("Local stream received");
      onLocalStream(event.detail.stream);
    };

    const handleRemoteStream = (event: any) => {
      console.log("Remote stream received");
      onRemoteStream(event.detail.stream);
      setIsConnected(true);
    };

    const handleCallEnded = () => {
      console.log("Call ended");
      setIsCallActive(false);
      setIsConnected(false);
      setConnectionState("new");
      setIceConnectionState("new");
      setCurrentCallId(null);
      setIsVideo(false);
      setIsMuted(false);
      setIsVideoEnabled(true);
      onCallEnded();
    };

    window.addEventListener("webrtc-localstream", handleLocalStream);
    window.addEventListener("webrtc-remotestream", handleRemoteStream);
    window.addEventListener("webrtc-callended", handleCallEnded);

    return () => {
      window.removeEventListener("webrtc-localstream", handleLocalStream);
      window.removeEventListener("webrtc-remotestream", handleRemoteStream);
      window.removeEventListener("webrtc-callended", handleCallEnded);
    };
  }, [onLocalStream, onRemoteStream, onCallEnded]);

  useEffect(() => {
    if (!isCallActive) return;

    const interval = setInterval(() => {
      const manager = getWebRTCManager();
      if (manager) {
        const connState = manager.getConnectionState();
        const iceState = manager.getICEConnectionState();

        if (connState) setConnectionState(connState);
        if (iceState) setIceConnectionState(iceState);

        setIsConnected(connState === "connected");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isCallActive]);

  const initiateCall = useCallback(
    async (receiverId: string, video = false) => {
      try {
        console.log(
          `📞 Initiating ${video ? "video" : "audio"} call to:`,
          receiverId
        );

        const manager = getWebRTCManager();
        if (!manager) {
          throw new Error("WebRTC manager not initialized");
        }

        const callId = await manager.initiateCall(receiverId, video);

        setCurrentCallId(callId);
        setIsCallActive(true);
        setIsVideo(video);

        toast({
          title: "Call Initiated",
          description: `${video ? "Video" : "Audio"} call started`,
        });
      } catch (error) {
        console.error("Error initiating call:", error);
        toast({
          variant: "destructive",
          title: "Call Failed",
          description: "Could not initiate call. Please try again.",
        });
      }
    },
    [toast]
  );

  const answerCall = useCallback(
    async (callId: string, callData: CallData) => {
      try {
        console.log("📞 Answering call:", callId);

        const manager = getWebRTCManager();
        if (!manager) {
          throw new Error("WebRTC manager not initialized");
        }

        await manager.answerCall(callId);

        setCurrentCallId(callId);
        setIsCallActive(true);
        setIsVideo(callData.isVideo);

        toast({
          title: "Call Answered",
          description: "Call connected successfully",
        });
      } catch (error) {
        console.error("❌ Error answering call:", error);
        toast({
          variant: "destructive",
          title: "Call Failed",
          description: "Could not answer call. Please try again.",
        });
      }
    },
    [toast]
  );

  const rejectCall = useCallback(
    async (callId: string) => {
      try {
        const manager = getWebRTCManager();
        if (!manager) return;

        await manager.rejectCall(callId);

        toast({
          title: "Call Rejected",
          description: "Call has been rejected",
        });
      } catch (error) {
        console.error("Error rejecting call:", error);
      }
    },
    [toast]
  );

  const handleCallEnd = useCallback(async () => {
    try {
      const manager = getWebRTCManager();
      if (!manager) return;

      await manager.endCall();
      setIsCallActive(false);
      setIsConnected(false);
      toast({
        title: "Call Ended",
        description: "Call has been ended",
      });
    } catch (error) {
      console.error("❌ Error ending call:", error);
    }
  }, [toast]);

  const toggleMute = useCallback(() => {
    const manager = getWebRTCManager();
    if (manager) {
      const muted = manager.toggleMute();
      setIsMuted(muted);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const manager = getWebRTCManager();
    if (manager) {
      const videoOff = manager.toggleVideo();
      setIsVideoEnabled(!videoOff);
    }
  }, []);

  return {
    isCallActive,
    isConnected,
    connectionState,
    iceConnectionState,
    isVideo,
    isMuted,
    isVideoEnabled,
    currentCallId,
    initiateCall,
    answerCall,
    rejectCall,
    handleCallEnd,
    toggleMute,
    toggleVideo,
  };
}
