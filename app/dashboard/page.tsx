"use client";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { EnhancedCallInterface } from "@/components/enhanced-call-interface";
import { ChatArea } from "@/components/chat-area";
import { EnhancedIncomingCall } from "@/components/enhanced-incoming-call";
import { Sidebar } from "@/components/sidebar";
import { useTheme } from "@/components/theme-provider";
import { useFirebase } from "@/lib/firebase-provider";
import { useWebRTCEnhanced } from "@/hooks/use-webrtc-enhanced";
import type { User } from "@/types/user";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ChatProvider } from "@/components/chat-context";
import { NotificationProvider } from "@/components/notification-provider";
import { toast } from "sonner";

interface CallData {
  callId: string;
  from: string;
  isVideo: boolean;
  timestamp: string;
}

export default function DashboardPage() {
  const { currentUser, db, loading: authLoading } = useFirebase();
  const [contacts, setContacts] = useState<User[]>([]);
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    callData: CallData;
    caller: User | null;
  } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [active, setIsChatActive] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [currentCaller, setCurrentCaller] = useState<User | null>(null);
  const { theme } = useTheme();

  const router = useRouter();

  const {
    isCallActive,
    isConnected,
    connectionState,
    iceConnectionState,
    isVideo,
    isMuted,
    isVideoEnabled,
    initiateCall,
    answerCall,
    rejectCall,
    handleCallEnd,
    toggleMute,
    toggleVideo,
    toggleShareScreen,
  } = useWebRTCEnhanced({
    currentUser,
    onIncomingCall: async (callData: CallData | null) => {
      if (callData) {
        try {
          const callerDoc = await getDoc(doc(db, "users", callData.from));
          if (callerDoc.exists()) {
            const callerData = callerDoc.data() as User;
            setCurrentCaller(callerData);
            setIncomingCall({
              callData,
              caller: callerData,
            });
          }
        } catch (error) {
          console.error("Error fetching caller data:", error);
        }
      } else {
        setCurrentCaller(null);
        setIncomingCall(null);
      }
    },
    onCallEnded: () => {
      setIncomingCall(null);
      setCurrentCaller(null);
      setLocalStream(null);
      setRemoteStream(null);
    },
    onRemoteStream: (stream: MediaStream) => {
      setRemoteStream(stream);
    },
    onLocalStream: (stream: MediaStream) => {
      setLocalStream(stream);
    },
  });

  useEffect(() => {
    if (!currentUser || !incomingCall?.callData.callId) return;

    const callRef = doc(db, "calls", incomingCall.callData.callId);

    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeCall = onSnapshot(callRef, (callSnap) => {
      if (!callSnap.exists()) return;

      const callData = callSnap.data() as any;
      const receiverId = callData.receiverId;

      if (receiverId && !unsubscribeUser) {
        const userRef = doc(db, "users", receiverId);
        unsubscribeUser = onSnapshot(userRef, (userSnap) => {
          if (!userSnap.exists()) return;
          const userData = userSnap.data();

          if (!userData?.incomingCall) {
            console.log("Receiver incomingCall null, reset state");
            setIncomingCall(null);
          }
        });
      }

      if (callData.status === "ended") {
        setIncomingCall(null);
        setCurrentCaller(null);
        setLocalStream(null);
        setRemoteStream(null);
      }
    });

    return () => {
      unsubscribeCall();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [currentUser, db, incomingCall?.callData.callId]);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login");
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);

    const setOnline = async () => {
      try {
        await updateDoc(userRef, {
          online: true,
        });
      } catch (error) {
        console.error("Error setting online:", error);
      }
    };

    const setOffline = async () => {
      try {
        await updateDoc(userRef, {
          online: false,
          lastSeen: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error setting offline:", error);
      }
    };

    const handleBeforeUnload = () => {
      setOffline();
    };

    const handleBlur = () => {
      setOffline();
    };

    const handleFocus = () => {
      setOnline();
    };

    const handleOffline = () => {
      setOffline();
    };

    const handleOnline = () => {
      setOnline();
    };

    setOnline();

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      setOffline();
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
    if (!sessionStorage.getItem("warningShown")) {
      const styleTitle =
        "color: red; font-size: 32px; font-weight: bold; text-shadow: 1px 1px black;";
      const styleBody =
        "color: white; background-color: red; font-size: 14px; padding: 10px; font-family: monospace;";
      const styleHighlight =
        "color: yellow; background-color: black; font-size: 16px; padding: 8px; font-weight: bold; font-family: monospace;";

      console.log("%c⚠️ WARNING! ⚠️", styleTitle);
      console.log(
        "%cThis is a browser feature intended for developers. If someone told you to copy and paste something here, it is a scam and will give them access to your messages, private keys, or account.",
        styleBody
      );
      console.log(
        "%cThis console is not a playground.\nIf someone told you to paste something here, they are trying to scam you. Pasting code here can give attackers FULL access to your account, private messages, and identity.",
        styleBody
      );
      console.log(
        "%cDO NOT paste code here if you don't fully understand what it does.",
        styleHighlight
      );

      sessionStorage.setItem("warningShown", "true");
    }
  }, []);

  const handleStartCall = useCallback(
    async (contact: User, isVideo: boolean) => {
      if (!currentUser || !db) return;

      try {
        console.log(
          `Starting ${isVideo ? "video" : "audio"} call with:`,
          contact.displayName
        );
        setCurrentCaller(contact);
        await initiateCall(contact.uid, isVideo);
      } catch (error) {
        console.error("Error starting call:", error);
        toast.error("Could not start call. Please try again.");
      }
    },
    [currentUser, db, initiateCall]
  );

  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall || !incomingCall.caller || !currentUser || !db) {
      console.error("Error: Missing call data or user information");
      return;
    }

    try {
      console.log("Accepting call from:", incomingCall.caller.displayName);
      await answerCall(incomingCall.callData.callId, incomingCall.callData);
      setIncomingCall(null);
    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Could not accept call. Please try again.");
    }
  }, [incomingCall, currentUser, db, answerCall]);

  const handleRejectCall = useCallback(async () => {
    if (!incomingCall || !incomingCall.caller || !currentUser || !db) return;

    try {
      console.log("Rejecting call from:", incomingCall.caller.displayName);
      await rejectCall(incomingCall.callData.callId);
      setIncomingCall(null);
      setCurrentCaller(null);
    } catch (error) {
      console.error("Error rejecting call:", error);
    }
  }, [incomingCall, currentUser, db, rejectCall]);

  const handleEndCall = useCallback(async () => {
    try {
      await handleCallEnd();
      setCurrentCaller(null);
    } catch (error) {
      console.error("Error ending call:", error);
    }
  }, [handleCallEnd]);

  if (authLoading || !currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ChatProvider>
      <NotificationProvider
        currentUserId={currentUser.uid}
        contacts={contacts}
        selectedContact={selectedContact}
      />
      <div
        className={`flex h-[100dvh] w-full overflow-hidden ${
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

        {isCallActive && (
          <EnhancedCallInterface
            isActive={isCallActive}
            isConnected={isConnected}
            connectionState={connectionState}
            iceConnectionState={iceConnectionState}
            isVideo={isVideo}
            isMuted={isMuted}
            isVideoEnabled={isVideoEnabled}
            shareScreen={toggleShareScreen}
            contact={currentCaller || selectedContact!}
            localStream={localStream}
            remoteStream={remoteStream}
            onEndCall={handleEndCall}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
          />
        )}

        {incomingCall && incomingCall.caller && (
          <EnhancedIncomingCall
            caller={incomingCall.caller}
            isVideo={incomingCall.callData.isVideo}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />
        )}
      </div>
    </ChatProvider>
  );
}
