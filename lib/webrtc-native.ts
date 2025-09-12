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
  getDocs,
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
  private activeCallData: {callerId: string, receiverId: string} | null = null
  private iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: ["stun:ss-turn2.xirsys.com"] },
    {
      username:
        "q7QA74tSlCuTrWC7oSQt0uf-E7ApShwd0-rIYKhGFW0zdsi4V4CxTZ5RqPtc6Cl8AAAAAGinGD1DaGxvZQ==",
      credential: "b407755c-7e8e-11f0-b44f-0242ac140004",
      urls: [
        "turn:ss-turn2.xirsys.com:80?transport=udp",
        "turn:ss-turn2.xirsys.com:3478?transport=udp",
        "turn:ss-turn2.xirsys.com:80?transport=tcp",
        "turn:ss-turn2.xirsys.com:3478?transport=tcp",
        "turns:ss-turn2.xirsys.com:443?transport=tcp",
        "turns:ss-turn2.xirsys.com:5349?transport=tcp",
      ],
    },
  ];

  constructor(db: Firestore, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  private createPeerConnection(): RTCPeerConnection {
    console.log("Creating new RTCPeerConnection...");

    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
    });

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`Connection state: ${state}`);

      if (state === "connected") {
        console.log("WebRTC connection established!");
        this.adjustVideoQuality();
        this.adjustAudioQuality();
      } else if (
        state === "failed" ||
        state === "disconnected" ||
        state === "closed"
      ) {
        console.log("Connection failed/disconnected/closed");
        this.handleCallEnd();
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`ICE connection state: ${state}`);

      if (state === "connected" || state === "completed") {
        console.log("ICE connection established!");
      } else if (
        state === "failed" ||
        state === "disconnected" ||
        state === "closed"
      ) {
        console.log("ICE connection failed");
        this.handleCallEnd();
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`ICE gathering state: ${pc.iceGatheringState}`);
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate && this.currentCallId) {
        console.log("New ICE candidate:", event.candidate);
        await this.sendICECandidate(event.candidate);
      } else if (!event.candidate) {
        console.log("ICE gathering completed");
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);

      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        console.log(
          "Remote stream received:",
          this.remoteStream.getTracks().length,
          "tracks"
        );

        this.dispatchStreamEvent("remotestream", this.remoteStream);
      }
    };

    pc.ondatachannel = (event) => {
      console.log("Data channel received:", event.channel.label);
    };

    this.peerConnection = pc;
    return pc;
  }

  private async getUserMedia(video = false): Promise<MediaStream | null> {
    try {
      console.log(`Requesting user media - Video: ${video}`);

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
        "User media obtained:",
        stream.getTracks().map((t) => `${t.kind}: ${t.label}`)
      );

      this.localStream = stream;
      this.dispatchStreamEvent("localstream", stream);

      return stream;
    } catch (error) {
      console.error("Error getting user media:", error);
      throw new Error(
        "Could not access camera/microphone. Please check permissions."
      );
    }
  }

  private async getActiveCandidateType(): Promise<string | null> {
    if (!this.peerConnection) return null;
    let activeCandidateType: string | null = null;

    const stats = await this.peerConnection.getStats();
    stats.forEach((report) => {
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        activeCandidateType = report.remoteCandidateId;
      }
    });

    if (!activeCandidateType) {
      console.warn("No active candidate type found");
    }

    if (activeCandidateType) {
      let type: string | null = null;
      stats.forEach((report) => {
        if (report.id === activeCandidateType && report.candidateType) {
          type = report.candidateType;
        }
      });
      return type;
    }
    return null;
  }

  private async adjustAudioQuality() {
    if (!this.peerConnection) return;
    const type = await this.getActiveCandidateType();
    const sender = this.peerConnection
      .getSenders()
      .find((s) => s.track && s.track.kind === "audio");
    if (!sender) return;

    try {
      const params = sender.getParameters();
      if (!params.encodings) params.encodings = [{}];

      if (type === "relay") {
        params.encodings[0].maxBitrate = 32 * 1000;
        console.log("Using TURN server, adjusting audio bitrate to 32kbps");
        try {
          await sender.track?.applyConstraints({ sampleRate: 16000 });
        } catch (err) {
          console.warn("Failed to apply audio constraints:", err);
        }
      } else {
        params.encodings[0].maxBitrate = 64 * 1000;
        console.log(
          "Using direct connection, adjusting audio bitrate to 64kbps"
        );
        try {
          await sender.track?.applyConstraints({ sampleRate: 44100 });
        } catch (err) {
          console.warn("Failed to apply audio constraints:", err);
        }
      }

      await sender.setParameters(params);
    } catch (err) {
      console.error("Failed to adjust audio quality:", err);
    }
  }

  private async adjustVideoQuality() {
    if (!this.peerConnection) return;
    const type = await this.getActiveCandidateType();
    const sender = this.peerConnection
      .getSenders()
      .find((s) => s.track && s.track.kind === "video");
    if (!sender) return;

    try {
      const params = sender.getParameters();
      if (!params.encodings) params.encodings = [{}];

      if (type === "relay") {
        params.encodings[0].maxBitrate = 300 * 1000;
        console.log("Using TURN server, adjusting video bitrate to 300kbps");
        try {
          await sender.track?.applyConstraints({
            width: 640,
            height: 480,
            frameRate: 20,
          });
        } catch (err) {
          console.warn("Failed to apply video constraints:", err);
        }
      } else {
        params.encodings[0].maxBitrate = 1500 * 1000;
        console.log(
          "Using direct connection, adjusting video bitrate to 1.5Mbps"
        );
        try {
          await sender.track?.applyConstraints({
            width: 1280,
            height: 720,
            frameRate: { ideal: 30, max: 60 },
          });
        } catch (err) {
          console.warn("Failed to apply video constraints:", err);
        }
      }

      await sender.setParameters(params);
      console.log("Video quality adjusted based on connection type");
    } catch (err) {
      console.error("Failed to adjust video quality:", err);
    }
  }

  private addLocalStreamToPeerConnection(
    stream: MediaStream,
    pc: RTCPeerConnection
  ) {
    console.log("Adding local stream to peer connection");

    stream.getTracks().forEach((track) => {
      console.log(`Adding ${track.kind} track:`, track.label);
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
      console.log("ICE candidate sent to Firestore");
    } catch (error) {
      console.error("Error sending ICE candidate:", error);
    }
  }

  private listenForICECandidates(callId: string) {
    console.log("Listening for ICE candidates...");

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
        console.log("Added ICE candidate");
      } else {
        this.iceCandidatesQueue.push(candidateData);
        console.log("Queued ICE candidate");
      }
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }

  private async processQueuedICECandidates() {
    if (this.hasRemoteDescription && this.iceCandidatesQueue.length > 0) {
      console.log(
        `Processing ${this.iceCandidatesQueue.length} queued ICE candidates`
      );

      for (const candidateData of this.iceCandidatesQueue) {
        try {
          const candidate = new RTCIceCandidate(candidateData);
          await this.peerConnection!.addIceCandidate(candidate);
          console.log("Added queued ICE candidate");
        } catch (error) {
          console.error("Error adding queued ICE candidate:", error);
        }
      }

      this.iceCandidatesQueue = [];
    }
  }

  async initiateCall(receiverId: string, isVideo = false): Promise<string> {
    try {
      console.log(
        `Initiating ${isVideo ? "video" : "audio"} call to:`,
        receiverId
      );

      const isReceiverUserAvailable = await this.checkUserAvailability(receiverId);
      if(!isReceiverUserAvailable){
         throw { code: "BUSY", message: "User is busy or on another call"}
      }

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
      await this.setUserInCall(callData.callerId, callData.receiverId);
      this.activeCallData = {
        callerId: callData.callerId,
        receiverId: callData.receiverId
      }

      await setDoc(doc(this.db, "calls", callId), callData);
      this.currentCallId = callId;

      this.listenForICECandidates(callId);

      console.log("Creating offer...");
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });

      await pc.setLocalDescription(offer);
      console.log("Local description set (offer)");

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

      setTimeout(async () => {
        const callSnap = await getDoc(doc(this.db, "calls", callId));
        if (callSnap.exists()) {
          const snapData = callSnap.data() as CallData;
          if (snapData.status === "calling") {
            console.log("Call TimeOut auto ending....");
            this.handleCallEnd();
          }
        }
      }, 15000);

      return callId;
    } catch (error) {
      console.error("Error initiating call:", error);
      throw error;
    }
  }

  private async checkUserAvailability(targetUserId: string){
    const targetSnap = await getDoc(doc(this.db, "users", targetUserId))
    if(!targetSnap.exists()) return true;
    const data = targetSnap.data();
    return !data.userInCall;
  }

  private async setUserInCall(callerId: string, receiverId: string){
    await Promise.all([
    updateDoc(doc(this.db, "users", callerId), {
      userInCall: true,
      currentCallId: this.currentCallId,
      otherUserId: receiverId, 
    }),
    updateDoc(doc(this.db, "users", receiverId), {
      userInCall: true,
      currentCallId: this.currentCallId,
      otherUserId: callerId,
    }),
  ]);
  }

  private async resetUserInCall(callerId: string, receiverId: string){
    await Promise.all([
      updateDoc(doc(this.db, "users", callerId), {
      userInCall: false,
      currentCallId: null,
      otherUserId: null,
    }),
    updateDoc(doc(this.db, "users", receiverId), {
      userInCall: false,
      currentCallId: null,
      otherUserId: null,
    }),
    ])
  }

  async shareScreen() {
    if (!this.peerConnection) {
      console.error("PeerConnection not Initialized");
      return;
    }

    try {
      const shareScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1080, max: 1920 },
          height: { ideal: 1080, max: 1920 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: true,
      });

      const screenVideoTrack = shareScreenStream.getVideoTracks()[0];
      const videoSender = this.peerConnection
        .getSenders()
        .find((s) => s.track?.kind === "video");

      if (videoSender && screenVideoTrack) {
        await videoSender.replaceTrack(screenVideoTrack);
        console.log("Replaced camera video with screen video");
      }

      const screenAudioTrack = shareScreenStream.getAudioTracks()[0];
      if (screenAudioTrack) {
        const audioSender = this.peerConnection
          .getSenders()
          .find((s) => s.track?.kind === "audio");

        if (audioSender) {
          await audioSender.replaceTrack(screenAudioTrack);
          console.log("Replaced mic audio with system audio");
        } else {
          this.peerConnection.addTrack(screenAudioTrack, shareScreenStream);
          console.log("Added system audio track");
        }
      }

      this.localStream = shareScreenStream;
      this.dispatchStreamEvent("localstream", shareScreenStream);

      screenVideoTrack.onended = async () => {
        console.log("Screen sharing stopped, falling back to camera");

        const camStream = await this.getUserMedia(true);
        if (!camStream) return;

        const camVideoTrack = camStream.getVideoTracks()[0];
        if (camVideoTrack && videoSender) {
          await videoSender.replaceTrack(camVideoTrack);
        }

        const micAudioTrack = camStream.getAudioTracks()[0];
        if (micAudioTrack) {
          const micSender = this.peerConnection
            ?.getSenders()
            .find((s) => s.track?.kind === "audio");
          if (micSender) await micSender.replaceTrack(micAudioTrack);
        }

        this.localStream = camStream;
        this.dispatchStreamEvent("localstream", camStream);
      };
    } catch (error) {
      console.log("Error Sharing Screen", error);
    }
  }

  async answerCall(callId: string): Promise<void> {
    try {
      console.log("Answering call:", callId);

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
        console.log("Setting remote description (offer)");
        await pc.setRemoteDescription(
          new RTCSessionDescription(callData.offer)
        );
        this.hasRemoteDescription = true;

        await this.processQueuedICECandidates();
      }

      console.log("Creating answer...");
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("Local description set (answer)");

      await updateDoc(doc(this.db, "calls", callId), {
        answer,
        status: "accepted",
      });

      await updateDoc(doc(this.db, "users", this.userId), {
        incomingCall: null,
      });

      console.log("Call answered successfully");
    } catch (error) {
      console.error("Error answering call:", error);
      throw error;
    }
  }

  private listenForCallUpdates(callId: string) {
    console.log("Listening for call updates:", callId);

    return onSnapshot(doc(this.db, "calls", callId), async (snapshot) => {
      if (!snapshot.exists()) {
        console.log("Call document deleted");
        this.handleCallEnd();
        return;
      }

      const callData = snapshot.data() as CallData;
      const pc = this.peerConnection;

      if (!pc) return;

      if (callData.answer && !this.hasRemoteDescription) {
        console.log("Received answer, setting remote description");
        try {
          await pc.setRemoteDescription(
            new RTCSessionDescription(callData.answer)
          );
          this.hasRemoteDescription = true;

          await this.processQueuedICECandidates();

          console.log("Remote description set (answer)");
        } catch (error) {
          console.error("Error setting remote description:", error);
        }
      }

      if (callData.status === "rejected" || callData.status === "ended") {
        console.log("Call ended/rejected");
        this.handleCallEnd();
      }
    });
  }

  listenForIncomingCalls(callback: (callData: any) => void) {
    console.log("Listening for incoming calls...");

    return onSnapshot(doc(this.db, "users", this.userId), (snapshot) => {
      const userData = snapshot.data();
      if (userData?.incomingCall) {
        console.log("Incoming call detected");
        callback(userData.incomingCall);
      }
    });
  }

  async rejectCall(callId: string): Promise<void> {
    try {
      await this.resetUserInCall(this.activeCallData?.callerId as string, this.activeCallData?.receiverId as string)

      await updateDoc(doc(this.db, "calls", callId), {
        status: "rejected",
      });

      await updateDoc(doc(this.db, "users", this.userId), {
        incomingCall: null,
      });

      console.log("Call rejected");
    } catch (error) {
      console.error("Error rejecting call:", error);
    }
  }

  async endCall(): Promise<void> {
    try {
      console.log("Ending call...");

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          track.stop();
          console.log(`Stopped ${track.kind} track`);
        });
        this.localStream = null;
      }

      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      this.remoteStream = null;

      if (this.currentCallId) {
        const callRef = doc(this.db, "calls", this.currentCallId);
        const callSnap = await getDoc(callRef);

        if (callSnap.exists()) {
          const callData = callSnap.data() as CallData;

          await this.resetUserInCall(callData.callerId, callData.receiverId)

          if (callData.receiverId) {
            await updateDoc(doc(this.db, "users", callData.receiverId), {
              incomingCall: null,
            });
          }

          await updateDoc(callRef, { status: "ended" }),
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
          console.log("Call doc has been delete, skip update/delete");
        }
      }

      this.currentCallId = null;
      this.hasRemoteDescription = false;
      this.iceCandidatesQueue = [];

      console.log("Call ended successfully");
    } catch (error) {
      console.error("Error ending call:", error);
    }
  }

  private handleCallEnd(): void {
    this.endCall();
    this.dispatchStreamEvent("callended", null);
  }

  toggleMute(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log(`Audio ${audioTrack.enabled ? "unmuted" : "muted"}`);
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
        console.log(`Video ${videoTrack.enabled ? "enabled" : "disabled"}`);
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
    callId,
    destroy: () => webrtcManager?.endCall(),
  };
};

export const acceptCall = async (
  db: Firestore,
  callData: any,
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

export const endCall = async () => {
  if (webrtcManager) {
    await webrtcManager.endCall();
  }
};
export { Firestore };
