/**
 * -----------------------------------------------------------------------------
 *  Project   : WebRTC Native - A TypeScript WebRTC Manager with Firestore Signaling
 *  Author    : Inggrit Setya Budi
 *  Created   : 2025-10-06
 *
 *  Description:
 *    Core WebRTC manager class using TypeScript and Firestore signaling.
 *    Handles peer connection, media streams, ICE candidates, call states,
 *    screen sharing, and connection statistics.
 *
 *
 *  License: GPLv3
 *    Copyright (c) 2025 Inggrit Setya Budi
 *
 *    This program is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    (at your option) any later version.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU General Public License for more details.
 *
 *    You should have received a copy of the GNU General Public License
 *    along with this program. If not, see <https://www.gnu.org/licenses/>.
 * -----------------------------------------------------------------------------
 */

"use client";

// import {
//   addDoc,
//   collection,
//   deleteDoc,
//   doc,
//   getDoc,
//   getDocs,
//   onSnapshot,
//   orderBy,
//   query,
//   setDoc,
//   updateDoc,
//   where,
//   type Firestore,
// } from "firebase/firestore";
import {
  Database,
  ref,
  set,
  push,
  onValue,
  get,
  update,
  off,
  onChildAdded,
  remove,
} from "firebase/database";

interface CallData {
  callerId: string;
  receiverId: string;
  offer?: RTCSessionDescriptionInit;
  // callerInfo: {
  //   displayName: string;
  //   photoURL: string | null;
  //   isVerified?: boolean;
  //   isAdmin?: boolean;
  // };
  // receiverInfo: {
  //   displayName: string;
  //   photoURL: string | null;
  //   isVerified?: boolean;
  //   isAdmin?: boolean;
  // };
  answer?: RTCSessionDescriptionInit;
  status: "calling" | "accepted" | "rejected" | "ended";
  isVideo: boolean;
  timestamp: string;
}

// interface ICECandidateData {
//   callId: string;
//   candidate: RTCIceCandidateInit;
//   from: string;
//   timestamp: string;
// }

export type WebRTCStats = {
  timestamp: number;
  rtt: number | null;
  packetLoss: number | null;
  videoFps: number | null;
  videoBitrate: number | null;
  audioBitrate: number | null;
  videoCodec?: string | null;
  jitter?: number | null;
  resolution?: { w: number; h: number } | null;
};

class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCallId: string | null = null;
  private db: Database;
  private userId: string;
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];
  private hasRemoteDescription = false;
  private lastBytes = {
    video: 0,
    audio: 0,
    time: 0,
  };
  private callStatusListener: any = null;
  private iceCandidateListener: any = null;
  private callTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentFacingMode: "user" | "environment" = "user";
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

  constructor(db: Database, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
    });

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;

      if (state === "connected") {
        console.log("WebRTC connection established!");
        this.adjustVideoQuality();
        this.adjustAudioQuality();
      } else if (["failed", "disconnected", "closed"].includes(state)) {
        console.log("Connection failed/disconnected/closed");
        this.handleCallEnd();
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`ICE gathering state: ${pc.iceGatheringState}`);
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate && this.currentCallId) {
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
        params.encodings[0].maxBitrate = 48 * 1000;
        console.log("Using TURN server, adjusting audio bitrate to 48kbps");
        try {
          await sender.track?.applyConstraints({ sampleRate: 24000 });
        } catch (err) {
          console.warn("Failed to apply audio constraints:", err);
        }
      } else {
        params.encodings[0].maxBitrate = 100 * 1000;
        console.log(
          "Using direct connection, adjusting audio bitrate to 100kbps"
        );
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
        console.log(
          "Using TURN server, adjusting video bitrate to 300kbps, 480p @20fps"
        );
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
        params.encodings[0].maxBitrate = 2000 * 1000;
        console.log(
          "Using direct connection, adjusting video bitrate to 2 Mbps, 1080p @30fps"
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
      // const candidateData: ICECandidateData = {
      //   callId: this.currentCallId,
      //   candidate: candidate.toJSON(),
      //   from: this.userId,
      //   timestamp: new Date().toISOString(),
      // };

      // await addDoc(collection(this.db, "iceCandidates"), candidateData);
      await push(ref(this.db, `ice_candidates/${this.currentCallId}`), {
        callId: this.currentCallId,
        candidate: candidate.toJSON(),
        from: this.userId,
        timestamp: new Date().toISOString(),
      });
      console.log("ICE candidate sent to Firestore");
    } catch (error) {
      console.error("Error sending ICE candidate:", error);
    }
  }

  private listenForICECandidates(callId: string) {
    console.log("Listening for ICE candidates...");

    // const q = query(
    //   collection(this.db, "iceCandidates"),
    //   where("callId", "==", callId),
    //   where("from", "!=", this.userId),
    //   orderBy("timestamp")
    // );

    const candidateRef = ref(this.db, `ice_candidates/${callId}`);

    this.iceCandidateListener = onChildAdded(candidateRef, async (snapshot) => {
      const data = snapshot.val();
      if (data && data.from !== this.userId) {
        await this.handleRemoteICECandidate(data.candidate);
      }
    });

    // return onSnapshot(q, async (snapshot) => {
    //   for (const change of snapshot.docChanges()) {
    //     if (change.type === "added") {
    //       const candidateData = change.doc.data() as ICECandidateData;
    //       await this.handleRemoteICECandidate(candidateData.candidate);
    //     }
    //   }
    // });
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

      // const isReceiverUserAvailable = await this.checkUserAvailability(
      //   receiverId
      // );
      // if (!isReceiverUserAvailable) {
      //   throw { code: "BUSY", message: "User is busy or on another call" };
      // }

      const userStatusSnap = await get(
        ref(this.db, `users/${receiverId}/userInCall`)
      );
      if (userStatusSnap.exists() && userStatusSnap.val() === true) {
        throw { code: "BUSY", message: "User is busy" };
      }

      const stream = await this.getUserMedia(isVideo);
      if (!stream) {
        throw new Error("Could not get user media");
      }

      const pc = this.createPeerConnection();

      this.addLocalStreamToPeerConnection(stream, pc);

      const callId = `${this.userId}_${receiverId}_${Date.now()}`;
      // const callData: CallData = {
      //   callerId: this.userId,
      //   receiverId,
      //   status: "calling",
      //   isVideo,
      //   timestamp: new Date().toISOString(),
      // };
      // await this.setUserInCall(callData.callerId, callData.receiverId);

      // await setDoc(doc(this.db, "calls", callId), callData);
      this.currentCallId = callId;

      this.listenForICECandidates(callId);

      console.log("Creating offer...");
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });

      await pc.setLocalDescription(offer);
      console.log("Local description set (offer)");

      // await updateDoc(doc(this.db, "calls", callId), {
      //   offer: {
      //     type: offer.type,
      //     sdp: offer.sdp,
      //   },
      // });

      // await updateDoc(doc(this.db, "users", receiverId), {
      //   incomingCall: {
      //     callId,
      //     from: this.userId,
      //     isVideo,
      //     timestamp: new Date().toISOString(),
      //   },
      // });

      const updates: any = {};
      updates[`calls/${callId}`] = {
        callerId: this.userId,
        receiverId,
        status: "calling",
        isVideo,
        timestamp: new Date().toISOString(),
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      };
      updates[`users/${receiverId}/incomingCall`] = {
        callId,
        from: this.userId,
        isVideo,
        timestamp: new Date().toISOString(),
      };
      updates[`users/${this.userId}/userInCall`] = true;
      updates[`users/${receiverId}/userInCall`] = true;

      await update(ref(this.db), updates);
      this.listenForCallUpdates(callId);

      // setTimeout(async () => {
      //   const callSnap = await getDoc(doc(this.db, "calls", callId));
      //   if (callSnap.exists()) {
      //     const snapData = callSnap.data() as CallData;
      //     if (snapData.status === "calling") {
      //       console.log("Call TimeOut auto ending....");
      //       this.handleCallEnd();
      //     }
      //   }
      // }, 15000);

      this.callTimeout = setTimeout(async () => {
        const s = await get(ref(this.db, `calls/${callId}/status`));
        if (s.exists() && s.val() === "calling") {
          console.log("Call timeout - no answer received.");
          this.handleCallEnd();
        }
      }, 30000);

      return callId;
    } catch (error) {
      console.error("Error initiating call:", error);
      throw error;
    }
  }

  // private async checkUserAvailability(targetUserId: string) {
  //   const targetSnap = await getDoc(doc(this.db, "users", targetUserId));
  //   if (!targetSnap.exists()) return true;
  //   const data = targetSnap.data();
  //   return !data.userInCall;
  // }

  // private async setUserInCall(callerId: string, receiverId: string) {
  //   await Promise.all([
  //     updateDoc(doc(this.db, "users", callerId), {
  //       userInCall: true,
  //       currentCallId: this.currentCallId,
  //       otherUserId: receiverId,
  //     }),
  //     updateDoc(doc(this.db, "users", receiverId), {
  //       userInCall: true,
  //       currentCallId: this.currentCallId,
  //       otherUserId: callerId,
  //     }),
  //   ]);
  // }

  // private async resetUserInCall(callerId: string, receiverId: string) {
  //   await Promise.all([
  //     updateDoc(doc(this.db, "users", callerId), {
  //       userInCall: false,
  //       currentCallId: null,
  //       otherUserId: null,
  //     }),
  //     updateDoc(doc(this.db, "users", receiverId), {
  //       userInCall: false,
  //       currentCallId: null,
  //       otherUserId: null,
  //     }),
  //   ]);
  // }

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

  // async answerCall(callId: string): Promise<void> {
  //   try {
  //     const callDoc = await getDoc(doc(this.db, "calls", callId));
  //     if (!callDoc.exists()) {
  //       throw new Error("Call not found");
  //     }

  //     const callData = callDoc.data() as CallData;

  //     const stream = await this.getUserMedia(callData.isVideo);
  //     if (!stream) {
  //       throw new Error("Could not get user media");
  //     }

  //     const pc = this.createPeerConnection();

  //     this.addLocalStreamToPeerConnection(stream, pc);

  //     this.currentCallId = callId;

  //     this.listenForICECandidates(callId);

  //     if (callData.offer) {
  //       console.log("Setting remote description (offer)");
  //       await pc.setRemoteDescription(
  //         new RTCSessionDescription(callData.offer)
  //       );
  //       this.hasRemoteDescription = true;

  //       await this.processQueuedICECandidates();
  //     }

  //     console.log("Creating answer...");
  //     const answer = await pc.createAnswer();
  //     await pc.setLocalDescription(answer);
  //     console.log("Local description set (answer)");

  //     await updateDoc(doc(this.db, "calls", callId), {
  //       answer: {
  //         type: answer.type,
  //         sdp: answer.sdp,
  //       },
  //       status: "accepted",
  //     });

  //     await updateDoc(doc(this.db, "users", this.userId), {
  //       incomingCall: null,
  //     });

  //     console.log("Call answered successfully");
  //   } catch (error) {
  //     console.error("Error answering call:", error);
  //     throw error;
  //   }
  // }

  async answerCall(callId: string): Promise<void> {
    try {
      const callSnapshot = await get(ref(this.db, `calls/${callId}`));
      if (!callSnapshot.exists()) throw new Error("Call not found");

      const callData = callSnapshot.val();
      const stream = await this.getUserMedia(callData.isVideo);

      const pc = this.createPeerConnection();
      this.addLocalStreamToPeerConnection(stream!, pc);
      this.currentCallId = callId;

      this.listenForICECandidates(callId);

      if (callData.offer) {
        await pc.setRemoteDescription(
          new RTCSessionDescription(callData.offer)
        );
        this.hasRemoteDescription = true;
        await this.processQueuedICECandidates();
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const updates: any = {};
      updates[`calls/${callId}/answer`] = {
        type: answer.type,
        sdp: answer.sdp,
      };
      updates[`calls/${callId}/status`] = "accepted";
      updates[`users/${this.userId}/incomingCall`] = null;

      await update(ref(this.db), updates);
    } catch (error) {
      console.error("Error answering:", error);
      throw error;
    }
  }

  private listenForCallUpdates(callId: string) {
    const callRef = ref(this.db, `calls/${callId}`);
    this.callStatusListener = onValue(callRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        this.handleCallEnd();
        return;
      }

      if (data.answer && !this.hasRemoteDescription && this.peerConnection) {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
        this.hasRemoteDescription = true;
        await this.processQueuedICECandidates();
      }

      if (data.status === "accepted") {
        if (this.callTimeout) {
          console.log("Call accepted, clearing timeout.");
          clearTimeout(this.callTimeout);
          this.callTimeout = null;
        }
      }

      if (data.status === "ended" || data.status === "rejected") {
        this.handleCallEnd();
      }
    });
  }

  listenForIncomingCalls(callback: (callData: any) => void) {
    const incomingRef = ref(this.db, `users/${this.userId}/incomingCall`);
    return onValue(incomingRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    });
  }

  // async rejectCall(callId: string): Promise<void> {
  //   try {
  //     const callRef = doc(this.db, "calls", callId);
  //     const callSnap = await getDoc(callRef);
  //     if (!callSnap.exists()) {
  //       console.log("Call not found or already ended");
  //       return;
  //     }

  //     const callData = callSnap.data() as CallData;

  //     await this.resetUserInCall(callData.callerId, callData.receiverId);
  //     await Promise.all([
  //       updateDoc(doc(this.db, "calls", callId), {
  //         status: "rejected",
  //       }),
  //       updateDoc(doc(this.db, "users", this.userId), {
  //         incomingCall: null,
  //       }),
  //     ]);

  //     console.log("Call rejected");
  //   } catch (error) {
  //     console.error("Error rejecting call:", error);
  //   }
  // }

  async rejectCall(callId: string): Promise<void> {
    try {
      const callRef = ref(this.db, `calls/${callId}`);
      const snapshot = await get(callRef);

      if (!snapshot.exists()) {
        console.log("Call not found or already ended");
        return;
      }

      const callData = snapshot.val() as CallData;

      const updates: any = {};

      updates[`calls/${callId}/status`] = "rejected";

      updates[`users/${this.userId}/incomingCall`] = null;

      if (callData.callerId) {
        updates[`users/${callData.callerId}/userInCall`] = false;
        updates[`users/${callData.callerId}/currentCallId`] = null;
        updates[`users/${callData.callerId}/otherUserId`] = null;
      }
      if (callData.receiverId) {
        updates[`users/${callData.receiverId}/userInCall`] = false;
        updates[`users/${callData.receiverId}/currentCallId`] = null;
        updates[`users/${callData.receiverId}/otherUserId`] = null;
      }

      await update(ref(this.db), updates);

      console.log("Call rejected");
    } catch (error) {
      console.error("Error rejecting call:", error);
    }
  }

  async switchCamera(): Promise<void> {
    if (!(await this.checkHasMultipleCamera())) {
      throw new Error("This device only have one camera.");
    }

    const sender = this.peerConnection
      ?.getSenders()
      .find((s) => s.track?.kind === "video");
    if (!sender) {
      throw new Error("video sender not found.");
    }
    const nextFacing =
      this.currentFacingMode === "user" ? "environment" : "user";

    const oldTrack = sender.track;
    oldTrack?.stop();

    await new Promise((resolve) => setTimeout(resolve, 150));

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { exact: nextFacing },
      },
    });
    const newTrack = newStream.getVideoTracks()[0];
    if (!newTrack) {
      throw new Error(`Facing camera ${nextFacing} not available`);
    }
    await sender.replaceTrack(newTrack);

    this.localStream = newStream;
    this.dispatchStreamEvent("localstream", newStream);

    this.currentFacingMode = nextFacing;
    console.info(`Camera switched to ${nextFacing}`);
  }

  private async checkHasMultipleCamera(): Promise<boolean> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(
      (device) => device.kind === "videoinput"
    );
    return videoInputs.length > 1;
  }

  // async endCall(): Promise<void> {
  //   try {
  //     console.log("Ending call...");

  //     if (this.localStream) {
  //       this.localStream.getTracks().forEach((track) => {
  //         track.stop();
  //         console.log(`Stopped ${track.kind} track`);
  //       });
  //       this.localStream = null;
  //       this.currentFacingMode = "user";
  //     }

  //     if (this.peerConnection) {
  //       this.peerConnection.close();
  //       this.peerConnection = null;
  //     }

  //     this.remoteStream = null;

  //     if (this.currentCallId) {
  //       const callRef = doc(this.db, "calls", this.currentCallId);
  //       const callSnap = await getDoc(callRef);

  //       if (callSnap.exists()) {
  //         const callData = callSnap.data() as CallData;

  //         await this.resetUserInCall(callData.callerId, callData.receiverId);

  //         if (callData.receiverId) {
  //           await updateDoc(doc(this.db, "users", callData.receiverId), {
  //             incomingCall: null,
  //           });
  //         }

  //         await updateDoc(callRef, { status: "ended" }),
  //           setTimeout(async () => {
  //             const callSnapAgain = await getDoc(callRef);
  //             if (callSnapAgain.exists()) {
  //               await deleteDoc(callRef);
  //             }

  //             const q = query(
  //               collection(this.db, "iceCandidates"),
  //               where("callId", "==", this.currentCallId)
  //             );
  //             const snapshot = await getDocs(q);
  //             const deletePromises = snapshot.docs.map((doc) =>
  //               deleteDoc(doc.ref)
  //             );
  //             await Promise.all(deletePromises);
  //           }, 1000);
  //       } else {
  //         console.log("Call doc has been delete, skip update/delete");
  //       }
  //     }

  //     this.currentCallId = null;
  //     this.hasRemoteDescription = false;
  //     this.iceCandidatesQueue = [];

  //     console.log("Call ended successfully");
  //   } catch (error) {
  //     console.error("Error ending call:", error);
  //   }
  // }

  async endCall(): Promise<void> {
    console.log("Ending call...");

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      this.localStream = null;
      this.currentFacingMode = "user";
    }

    if (this.callTimeout) {
      clearTimeout(this.callTimeout);
      this.callTimeout = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;

    if (this.currentCallId) {
      const callId = this.currentCallId;

      if (this.callStatusListener) off(ref(this.db, `calls/${callId}`));
      if (this.iceCandidateListener)
        off(ref(this.db, `ice_candidates/${callId}`));

      try {
        const snap = await get(ref(this.db, `calls/${callId}`));
        if (snap.exists()) {
          const data = snap.val();
          const updates: any = {};
          if (data.receiverId)
            updates[`users/${data.receiverId}/incomingCall`] = null;
          if (data.callerId)
            updates[`users/${data.callerId}/userInCall`] = false;
          if (data.receiverId)
            updates[`users/${data.receiverId}/userInCall`] = false;
          updates[`calls/${callId}/status`] = "ended";

          await update(ref(this.db), updates);

          setTimeout(() => {
            const clear: any = {};
            clear[`calls/${callId}`] = null;
            clear[`ice_candidates/${callId}`] = null;
            update(ref(this.db), clear);
          }, 15000);
        }
      } catch (e) {
        console.error(e);
      }
    }

    this.currentCallId = null;
    this.hasRemoteDescription = false;
    this.iceCandidatesQueue = [];
    this.dispatchStreamEvent("callended", null);
  }

  async getConnectionStats(): Promise<WebRTCStats> {
    const report = await this.peerConnection?.getStats();

    let rtt: number | null = null;
    let packetsLost = 0;
    let packetsReceived = 0;
    let fps: number | null = null;
    let videoBytes = 0;
    let audioBytes = 0;
    let videoCodec: string | null = null;
    let jitter: number | null = null;
    let resolution: { w: number; h: number } | null = null;
    const now = Date.now();

    const codecsById = new Map<string, any>();
    report?.forEach((stat) => {
      if (stat.type === "codec") {
        codecsById.set(stat.id, stat);
      }
    });

    report?.forEach((stat) => {
      if (stat.type === "remote-inbound-rtp" && stat.roundTripTime) {
        rtt = stat.roundTripTime * 1000;
      }

      if (stat.type === "inbound-rtp") {
        if (
          typeof stat.packetsLost === "number" &&
          typeof stat.packetsReceived === "number"
        ) {
          packetsLost += stat.packetsLost;
          packetsReceived += stat.packetsReceived;
        }

        if (stat.kind === "video") {
          if (typeof stat.framesPerSecond === "number") {
            fps = stat.framesPerSecond;
          }

          const codecId = (stat as any).codecId;
          const codec = codecId ? codecsById.get(codecId) : null;
          if (codec) {
            videoCodec = codec.mimeType || codec.name || null;
          }

          if (typeof (stat as any).jitter === "number") {
            jitter = (stat as any).jitter * 1000;
          }
        }
      }

      if (stat.type === "outbound-rtp") {
        if (stat.kind === "video" && stat.bytesSent !== undefined) {
          videoBytes = stat.bytesSent;
        }
        if (stat.kind === "audio" && stat.bytesSent !== undefined) {
          audioBytes = stat.bytesSent;
        }
      }

      if (stat.type === "track" && (stat as any).frameWidth) {
        resolution = {
          w: (stat as any).frameWidth,
          h: (stat as any).frameHeight,
        };
      }

      if (stat.type === "inbound-rtp" && (stat as any).kind === "video") {
        if ((stat as any).frameWidth && (stat as any).frameHeight) {
          resolution = {
            w: (stat as any).frameWidth,
            h: (stat as any).frameHeight,
          };
        }
      }
    });

    let videoBitrate = null;
    let audioBitrate = null;

    if (this.lastBytes.time > 0) {
      const timeDiff = (now - this.lastBytes.time) / 1000;
      videoBitrate =
        ((videoBytes - this.lastBytes.video) * 8) / 1000 / timeDiff;
      audioBitrate =
        ((audioBytes - this.lastBytes.audio) * 8) / 1000 / timeDiff;
    }

    this.lastBytes = { video: videoBytes, audio: audioBytes, time: now };

    const totalPackets = packetsLost + packetsReceived;
    const packetLossPct =
      totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

    return {
      timestamp: now,
      rtt,
      packetLoss: packetLossPct,
      videoFps: fps,
      videoBitrate,
      audioBitrate,
      videoCodec,
      jitter,
      resolution,
    };
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

export const initializeWebRTC = (db: Database, userId: string) => {
  if (!webrtcManager) {
    webrtcManager = new WebRTCManager(db, userId);
  }
  return webrtcManager;
};

export const getWebRTCManager = (): WebRTCManager | null => {
  return webrtcManager;
};

export const listenForCalls = (
  db: Database,
  userId: string,
  callback: (callData: any) => void
) => {
  if (!webrtcManager) {
    webrtcManager = new WebRTCManager(db, userId);
  }
  return webrtcManager.listenForIncomingCalls(callback);
};

// export const initiateCall = async (
//   db: Database,
//   userId: string,
//   recipientId: string,
//   isVideo: boolean
// ) => {
//   if (!webrtcManager) {
//     webrtcManager = new WebRTCManager(db, userId);
//   }

//   const callId = await webrtcManager.initiateCall(recipientId, isVideo);

//   return {
//     on: (event: string, callback: Function) => {
//       if (event === "stream") {
//         window.addEventListener("webrtc-remotestream", (e: any) => {
//           callback(e.detail.stream);
//         });
//       }
//     },
//     callId,
//     destroy: () => webrtcManager?.endCall(),
//   };
// };

// export const acceptCall = async (
//   db: Database,
//   callData: any,
//   userId: string
// ) => {
//   if (!webrtcManager) {
//     webrtcManager = new WebRTCManager(db, userId);
//   }

//   await webrtcManager.answerCall(callData.callId);

//   return {
//     on: (event: string, callback: Function) => {
//       if (event === "stream") {
//         window.addEventListener("webrtc-remotestream", (e: any) => {
//           callback(e.detail.stream);
//         });
//       }
//     },
//     destroy: () => webrtcManager?.endCall(),
//   };
// };

// export const endCall = async () => {
//   if (webrtcManager) {
//     await webrtcManager.endCall();
//   }
// };
// export { Firestore };
