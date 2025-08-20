"use client";

import {
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDoc,
  type Firestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs, // Import getDocs
} from "firebase/firestore";

interface CallData {
  callerId: string;
  receiverId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  status: "calling" | "accepted" | "rejected" | "ended";
  isVideo: boolean;
  timestamp: string;
}

interface ICECandidateData {
  callId: string;
  candidate: RTCIceCandidateInit;
  from: string;
  timestamp: string;
}

class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCallId: string | null = null;
  private db: Firestore;
  private userId: string;
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];
  private hasRemoteDescription = false;

  private iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ];

  constructor(db: Firestore, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  private createPeerConnection(): RTCPeerConnection {
    console.log("🔄 Creating new RTCPeerConnection...");

    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
    });

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`🔗 Connection state: ${state}`);

      if (state === "connected") {
        console.log("✅ WebRTC connection established!");
      } else if (
        state === "failed" ||
        state === "disconnected" ||
        state === "closed"
      ) {
        console.log("❌ Connection failed/disconnected/closed");
        this.handleCallEnd();
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`🧊 ICE connection state: ${state}`);

      if (state === "connected" || state === "completed") {
        console.log("✅ ICE connection established!");
      } else if (
        state === "failed" ||
        state === "disconnected" ||
        state === "closed"
      ) {
        console.log("❌ ICE connection failed");
        this.handleCallEnd();
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`📡 ICE gathering state: ${pc.iceGatheringState}`);
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate && this.currentCallId) {
        console.log("🧊 New ICE candidate:", event.candidate);
        await this.sendICECandidate(event.candidate);
      } else if (!event.candidate) {
        console.log("🏁 ICE gathering completed");
      }
    };

    pc.ontrack = (event) => {
      console.log("📺 Received remote track:", event.track.kind);

      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        console.log(
          "✅ Remote stream received:",
          this.remoteStream.getTracks().length,
          "tracks"
        );

        this.dispatchStreamEvent("remotestream", this.remoteStream);
      }
    };

    pc.ondatachannel = (event) => {
      console.log("📡 Data channel received:", event.channel.label);
    };

    this.peerConnection = pc;
    return pc;
  }

  private async getUserMedia(video = false): Promise<MediaStream | null> {
    try {
      console.log(`🎥 Requesting user media - Video: ${video}`);

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
        video: video
          ? {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 30, max: 60 },
              facingMode: "user",
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log(
        "✅ User media obtained:",
        stream.getTracks().map((t) => `${t.kind}: ${t.label}`)
      );

      this.localStream = stream;
      this.dispatchStreamEvent("localstream", stream);

      return stream;
    } catch (error) {
      console.error("❌ Error getting user media:", error);
      throw new Error(
        "Could not access camera/microphone. Please check permissions."
      );
    }
  }

  private addLocalStreamToPeerConnection(
    stream: MediaStream,
    pc: RTCPeerConnection
  ) {
    console.log("➕ Adding local stream to peer connection");

    stream.getTracks().forEach((track) => {
      console.log(`➕ Adding ${track.kind} track:`, track.label);
      pc.addTrack(track, stream);
    });
  }

  private async sendICECandidate(candidate: RTCIceCandidate) {
    if (!this.currentCallId) return;

    try {
      const candidateData: ICECandidateData = {
        callId: this.currentCallId,
        candidate: candidate.toJSON(),
        from: this.userId,
        timestamp: new Date().toISOString(),
      };

      await addDoc(collection(this.db, "iceCandidates"), candidateData);
      console.log("✅ ICE candidate sent to Firestore");
    } catch (error) {
      console.error("❌ Error sending ICE candidate:", error);
    }
  }

  private listenForICECandidates(callId: string) {
    console.log("👂 Listening for ICE candidates...");

    const q = query(
      collection(this.db, "iceCandidates"),
      where("callId", "==", callId),
      where("from", "!=", this.userId),
      orderBy("timestamp")
    );

    return onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === "added") {
          const candidateData = change.doc.data() as ICECandidateData;
          await this.handleRemoteICECandidate(candidateData.candidate);
        }
      }
    });
  }

  private async handleRemoteICECandidate(candidateData: RTCIceCandidateInit) {
    if (!this.peerConnection) return;

    try {
      const candidate = new RTCIceCandidate(candidateData);

      if (this.hasRemoteDescription) {
        await this.peerConnection.addIceCandidate(candidate);
        console.log("✅ Added ICE candidate");
      } else {
        this.iceCandidatesQueue.push(candidateData);
        console.log("📦 Queued ICE candidate");
      }
    } catch (error) {
      console.error("❌ Error adding ICE candidate:", error);
    }
  }

  private async processQueuedICECandidates() {
    if (this.hasRemoteDescription && this.iceCandidatesQueue.length > 0) {
      console.log(
        `🧊 Processing ${this.iceCandidatesQueue.length} queued ICE candidates`
      );

      for (const candidateData of this.iceCandidatesQueue) {
        try {
          const candidate = new RTCIceCandidate(candidateData);
          await this.peerConnection!.addIceCandidate(candidate);
          console.log("✅ Added queued ICE candidate");
        } catch (error) {
          console.error("❌ Error adding queued ICE candidate:", error);
        }
      }

      this.iceCandidatesQueue = [];
    }
  }

  async initiateCall(receiverId: string, isVideo = false): Promise<string> {
    try {
      console.log(
        `📞 Initiating ${isVideo ? "video" : "audio"} call to:`,
        receiverId
      );

      const stream = await this.getUserMedia(isVideo);
      if (!stream) {
        throw new Error("Could not get user media");
      }

      const pc = this.createPeerConnection();

      this.addLocalStreamToPeerConnection(stream, pc);

      const callId = `${this.userId}_${receiverId}_${Date.now()}`;
      const callData: CallData = {
        callerId: this.userId,
        receiverId,
        status: "calling",
        isVideo,
        timestamp: new Date().toISOString(),
      };

      await setDoc(doc(this.db, "calls", callId), callData);
      this.currentCallId = callId;

      this.listenForICECandidates(callId);

      console.log("📝 Creating offer...");
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });

      await pc.setLocalDescription(offer);
      console.log("✅ Local description set (offer)");

      await updateDoc(doc(this.db, "calls", callId), {
        offer,
      });

      await updateDoc(doc(this.db, "users", receiverId), {
        incomingCall: {
          callId,
          from: this.userId,
          isVideo,
          timestamp: new Date().toISOString(),
        },
      });

      this.listenForCallUpdates(callId);

      console.log("✅ Call initiated successfully");
      return callId;
    } catch (error) {
      console.error("❌ Error initiating call:", error);
      throw error;
    }
  }

  async answerCall(callId: string): Promise<void> {
    try {
      console.log("📞 Answering call:", callId);

      const callDoc = await getDoc(doc(this.db, "calls", callId));
      if (!callDoc.exists()) {
        throw new Error("Call not found");
      }

      const callData = callDoc.data() as CallData;

      const stream = await this.getUserMedia(callData.isVideo);
      if (!stream) {
        throw new Error("Could not get user media");
      }

      const pc = this.createPeerConnection();

      this.addLocalStreamToPeerConnection(stream, pc);

      this.currentCallId = callId;

      this.listenForICECandidates(callId);

      if (callData.offer) {
        console.log("📝 Setting remote description (offer)");
        await pc.setRemoteDescription(
          new RTCSessionDescription(callData.offer)
        );
        this.hasRemoteDescription = true;

        await this.processQueuedICECandidates();
      }

      console.log("📝 Creating answer...");
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("✅ Local description set (answer)");

      await updateDoc(doc(this.db, "calls", callId), {
        answer,
        status: "accepted",
      });

      await updateDoc(doc(this.db, "users", this.userId), {
        incomingCall: null,
      });

      console.log("✅ Call answered successfully");
    } catch (error) {
      console.error("❌ Error answering call:", error);
      throw error;
    }
  }

  private listenForCallUpdates(callId: string) {
    console.log("👂 Listening for call updates:", callId);

    return onSnapshot(doc(this.db, "calls", callId), async (snapshot) => {
      if (!snapshot.exists()) {
        console.log("📞 Call document deleted");
        this.handleCallEnd();
        return;
      }

      const callData = snapshot.data() as CallData;
      const pc = this.peerConnection;

      if (!pc) return;

      if (callData.answer && !this.hasRemoteDescription) {
        console.log("📝 Received answer, setting remote description");
        try {
          await pc.setRemoteDescription(
            new RTCSessionDescription(callData.answer)
          );
          this.hasRemoteDescription = true;

          await this.processQueuedICECandidates();

          console.log("✅ Remote description set (answer)");
        } catch (error) {
          console.error("❌ Error setting remote description:", error);
        }
      }

      if (callData.status === "rejected" || callData.status === "ended") {
        console.log("📞 Call ended/rejected");
        this.handleCallEnd();
      }
    });
  }

  listenForIncomingCalls(callback: (callData: any) => void) {
    console.log("👂 Listening for incoming calls...");

    return onSnapshot(doc(this.db, "users", this.userId), (snapshot) => {
      const userData = snapshot.data();
      if (userData?.incomingCall) {
        console.log("📞 Incoming call detected");
        callback(userData.incomingCall);
      }
    });
  }

  async rejectCall(callId: string): Promise<void> {
    try {
      await updateDoc(doc(this.db, "calls", callId), {
        status: "rejected",
      });

      await updateDoc(doc(this.db, "users", this.userId), {
        incomingCall: null,
      });

      console.log("✅ Call rejected");
    } catch (error) {
      console.error("❌ Error rejecting call:", error);
    }
  }

  async endCall(): Promise<void> {
    try {
      console.log("📞 Ending call...");

      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          track.stop();
          console.log(`🛑 Stopped ${track.kind} track`);
        });
        this.localStream = null;
      }

      this.remoteStream = null;

      if (this.currentCallId) {
        const callRef = doc(this.db, "calls", this.currentCallId);
        const callSnap = await getDoc(callRef);

        if (callSnap.exists()) {
          await updateDoc(callRef, { status: "ended" });

          setTimeout(async () => {
            const callSnapAgain = await getDoc(callRef);
            if (callSnapAgain.exists()) {
              await deleteDoc(callRef);
            }

            const q = query(
              collection(this.db, "iceCandidates"),
              where("callId", "==", this.currentCallId)
            );
            const snapshot = await getDocs(q);
            const deletePromises = snapshot.docs.map((doc) =>
              deleteDoc(doc.ref)
            );
            await Promise.all(deletePromises);
          }, 1000);
        } else {
          console.log("⚠️ Call doc has been delete, skip update/delete");
        }
      }

      this.currentCallId = null;
      this.hasRemoteDescription = false;
      this.iceCandidatesQueue = [];

      this.dispatchStreamEvent("callended", null);

      console.log("✅ Call ended successfully");
    } catch (error) {
      console.error("❌ Error ending call:", error);
    }
  }

  private handleCallEnd() {
    this.endCall();
    this.dispatchStreamEvent("callended", null);
  }

  toggleMute(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log(`🔇 Audio ${audioTrack.enabled ? "unmuted" : "muted"}`);
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        console.log(`📹 Video ${videoTrack.enabled ? "enabled" : "disabled"}`);
        return !videoTrack.enabled;
      }
    }
    return false;
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }

  getICEConnectionState(): RTCIceConnectionState | null {
    return this.peerConnection?.iceConnectionState || null;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  private dispatchStreamEvent(type: string, stream: MediaStream | null) {
    const event = new CustomEvent(`webrtc-${type}`, {
      detail: { stream },
    });
    window.dispatchEvent(event);
  }
}

let webrtcManager: WebRTCManager | null = null;

export const initializeWebRTC = (db: Firestore, userId: string) => {
  if (!webrtcManager) {
    webrtcManager = new WebRTCManager(db, userId);
  }
  return webrtcManager;
};

export const getWebRTCManager = (): WebRTCManager | null => {
  return webrtcManager;
};

export const listenForCalls = (
  db: Firestore,
  userId: string,
  callback: (callData: any) => void
) => {
  if (!webrtcManager) {
    webrtcManager = new WebRTCManager(db, userId);
  }
  return webrtcManager.listenForIncomingCalls(callback);
};

export const initiateCall = async (
  db: Firestore,
  localStream: MediaStream,
  userId: string,
  recipientId: string,
  isVideo: boolean
) => {
  if (!webrtcManager) {
    webrtcManager = new WebRTCManager(db, userId);
  }

  const callId = await webrtcManager.initiateCall(recipientId, isVideo);

  return {
    on: (event: string, callback: Function) => {
      if (event === "stream") {
        window.addEventListener("webrtc-remotestream", (e: any) => {
          callback(e.detail.stream);
        });
      }
    },
    destroy: () => webrtcManager?.endCall(),
  };
};

export const acceptCall = async (
  db: Firestore,
  callData: any,
  localStream: MediaStream,
  userId: string
) => {
  if (!webrtcManager) {
    webrtcManager = new WebRTCManager(db, userId);
  }

  await webrtcManager.answerCall(callData.callId);

  return {
    on: (event: string, callback: Function) => {
      if (event === "stream") {
        window.addEventListener("webrtc-remotestream", (e: any) => {
          callback(e.detail.stream);
        });
      }
    },
    destroy: () => webrtcManager?.endCall(),
  };
};

export const endCall = async (
  db: Firestore,
  userId: string,
  peerId: string
) => {
  if (webrtcManager) {
    await webrtcManager.endCall();
  }
};
export { Firestore };
