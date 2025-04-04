"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";

import { ArrowLeft, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { CallInterface } from "@/components/call-interface";
import { IncomingCall } from "@/components/incoming-call";
import {
  initiateCall,
  listenForCalls,
  acceptCall,
  endCall,
} from "@/lib/webrtc";
import type { User } from "@/types/user";
import { useTheme } from "@/components/theme-provider";
import { useFirebase } from "@/lib/firebase-provider";
import { StoriesRow } from "@/components/story/stories-row";

export default function DashboardPage() {
  const { currentUser, db, loading: authLoading } = useFirebase();
  const [contacts, setContacts] = useState<User[]>([]);
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [callState, setCallState] = useState<{
    isActive: boolean;
    isIncoming: boolean;
    isVideo: boolean;
    peer: any;
    remoteStream: MediaStream | null;
    localStream: MediaStream | null;
    caller: User | null;
  }>({
    isActive: false,
    isIncoming: false,
    isVideo: false,
    peer: null,
    remoteStream: null,
    localStream: null,
    caller: null,
  });
  const [incomingCall, setIncomingCall] = useState<{
    caller: User | null;
    isVideo: boolean;
  } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [active, setIsChatActive] = useState(false);
  const { theme } = useTheme();

  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login");
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    if (!currentUser) return;

    const updateOnlineStatus = async () => {
      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          online: true,
        });
      } catch (error) {
        console.error("Error updating online status:", error);
      }
    };

    updateOnlineStatus();

    const handleBeforeUnload = async () => {
      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          online: false,
        });
      } catch (error) {
        console.error("Error updating offline status:", error);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [currentUser, db]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "users"),
      where("uid", "!=", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contactsList: User[] = [];
      snapshot.forEach((doc) => {
        contactsList.push(doc.data() as User);
      });
      setContacts(contactsList);
    });

    return () => unsubscribe();
  }, [currentUser, db]);

  useEffect(() => {
    if (!currentUser || !db) return;

    const unsubscribe = listenForCalls(
      db,
      currentUser.uid,
      async (callData) => {
        if (callData) {
          try {
            const callerDoc = await getDoc(doc(db, "users", callData.from));
            if (callerDoc.exists()) {
              const callerData = callerDoc.data() as User;
              setIncomingCall({
                caller: callerData,
                isVideo: callData.isVideo,
              });
            }
          } catch (error) {
            console.error("Error fetching caller data:", error);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [currentUser, db]);

  const handleStartCall = useCallback(
    async (contact: User, isVideo: boolean) => {
      if (!currentUser || !db) return;

      try {
        const constraints = {
          audio: true,
          video: isVideo,
        };

        const localStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );

        const peer = await initiateCall(
          db,
          localStream,
          currentUser.uid,
          contact.uid,
          isVideo
        );

        peer.on("stream", (remoteStream: MediaStream) => {
          setCallState((prev) => ({
            ...prev,
            remoteStream,
          }));
        });

        setCallState({
          isActive: true,
          isIncoming: false,
          isVideo,
          peer,
          localStream,
          remoteStream: null,
          caller: null,
        });
      } catch (error) {
        console.error("Error starting call:", error);
        alert(
          "Could not start call. Please check your camera and microphone permissions."
        );
      }
    },
    [currentUser, db]
  );

  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall || !incomingCall.caller || !currentUser || !db) {
      console.error(
        "❌ Error: incomingCall, caller, currentUser, atau db tidak tersedia."
      );
      return;
    }

    try {
      const constraints = {
        audio: true,
        video: incomingCall.isVideo,
      };

      const localStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );
      console.log("🎤 Local media stream obtained:", localStream);

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userData = userDoc.data();

      const callerId = incomingCall.caller.uid;
      const receiverId = userData?.uid;
      const callId = `${receiverId}_${callerId}`;
      const callDoc = await getDoc(doc(db, "calls", callId));
      const callData = callDoc.data();

      if (userData?.incomingCall) {
        const peer = await acceptCall(
          db,
          callData,
          localStream,
          currentUser.uid
        );
        console.log("✅ Peer connection established:", peer);
        console.log(peer.streams);

        peer.on("stream", (remoteStream: MediaStream) => {
          console.log("📡 Remote stream received:", remoteStream);
          setCallState((prev) => ({
            ...prev,
            remoteStream,
          }));
        });

        setCallState({
          isActive: true,
          isIncoming: true,
          isVideo: incomingCall.isVideo,
          peer,
          localStream,
          remoteStream: null,
          caller: incomingCall.caller,
        });

        setIncomingCall(null);
        console.log("✅ Call accepted and state updated.");
      } else {
        console.warn("⚠ No incoming call data found in user document.");
      }
    } catch (error) {
      console.error("❌ Error accepting call:", error);
      alert(
        "Could not accept call. Please check your camera and microphone permissions."
      );
    }
  }, [incomingCall, currentUser, db]);

  const handleRejectCall = useCallback(async () => {
    if (!incomingCall || !incomingCall.caller || !currentUser || !db) return;

    try {
      await endCall(db, currentUser.uid, incomingCall.caller.uid);

      setIncomingCall(null);
    } catch (error) {
      console.error("Error rejecting call:", error);
    }
  }, [incomingCall, currentUser, db]);

  const handleEndCall = useCallback(async () => {
    if (!currentUser || !db) return;

    try {
      if (callState.localStream) {
        callState.localStream.getTracks().forEach((track) => track.stop());
      }

      if (callState.peer) {
        callState.peer.destroy();
      }

      if (callState.isIncoming && callState.caller) {
        await endCall(db, currentUser.uid, callState.caller.uid);
      } else if (selectedContact) {
        await endCall(db, currentUser.uid, selectedContact.uid);
      }

      setCallState({
        isActive: false,
        isIncoming: false,
        isVideo: false,
        peer: null,
        remoteStream: null,
        localStream: null,
        caller: null,
      });
    } catch (error) {
      console.error("Error ending call:", error);
    }
  }, [callState, selectedContact, currentUser, db]);

  const handleToggleMute = useCallback(() => {
    if (callState.localStream) {
      const audioTracks = callState.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  }, [callState]);

  const handleToggleVideo = useCallback(() => {
    if (callState.localStream) {
      const videoTracks = callState.localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  }, [callState]);

  if (authLoading || !currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen w-full overflow-hidden ${
        theme === "dark" ? "dark" : ""
      }`}
    >
      {!isMobileMenuOpen && !active && (
        <button
          className="absolute top-4 left-4 z-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <ArrowLeft className="h-6 w-6 dark:text-white text-black" />
        </button>
      )}

      <div
        className={`${
          isMobileMenuOpen ? "block" : "hidden"
        } md:block md:relative fixed inset-0 z-40 bg-background`}
      >
        <Sidebar
          user={currentUser}
          contacts={contacts}
          selectedContact={selectedContact}
          setSelectedContact={(contact) => {
            setSelectedContact(contact);
            setIsMobileMenuOpen(false);
          }}
          setIsChatActive={setIsChatActive}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          initiateCall={handleStartCall}
        />
      </div>

      <div className="flex-1 md:block">
        {selectedContact ? (
          <ChatArea
            currentUser={currentUser}
            contact={selectedContact}
            initiateCall={(isVideo) =>
              handleStartCall(selectedContact, isVideo)
            }
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
        ) : (
          <div className="flex flex-1 h-full items-center justify-center bg-gray-50 dark:bg-background md:pt-0 pt-14">
            <p className="text-muted-foreground">
              Select a contact to start chatting
            </p>
          </div>
        )}
      </div>

      {callState.isActive && (
        <CallInterface
          isVideo={callState.isVideo}
          remoteStream={callState.remoteStream}
          localStream={callState.localStream}
          contact={callState.isIncoming ? callState.caller : selectedContact}
          endCall={handleEndCall}
          toggleMute={handleToggleMute}
          toggleVideo={handleToggleVideo}
        />
      )}

      {incomingCall && incomingCall.caller && (
        <IncomingCall
          caller={incomingCall.caller}
          isVideo={incomingCall.isVideo}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </div>
  );
}
