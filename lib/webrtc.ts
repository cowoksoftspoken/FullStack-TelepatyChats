// import Peer, { Instance } from "simple-peer";
// import {
//   doc,
//   setDoc,
//   onSnapshot,
//   updateDoc,
//   deleteDoc,
//   type Firestore,
// } from "firebase/firestore";

// const activePeers = new Map<string, Instance>();

// const getPeer = (
//   userId: string,
//   remotePeerId: string
// ): Instance | undefined => {
//   const callId = [userId, remotePeerId].sort().join("_");
//   return activePeers.get(callId);
// };

// export const createPeer = (
//   db: Firestore,
//   initiator: boolean,
//   stream: MediaStream,
//   userId: string,
//   remotePeerId: string
// ) => {
//   console.log("initiator stream", stream);

//   const peer = new Peer({
//     initiator,
//     trickle: false,
//     stream,
//     config: {
//       iceServers: [
//         { urls: "stun:stun.l.google.com:19302" },
//         {
//           urls: "turn:openrelay.metered.ca:80",
//           username: "openrelayproject",
//           credential: "openrelayproject",
//         },
//       ],
//     },
//   });

//   const callId = [userId, remotePeerId].sort().join("_");

//   activePeers.set(callId, peer);

//   stream.getTracks().forEach((track) => {
//     if (!peer.streams[0]?.getTracks().includes(track)) {
//       peer.addTrack(track, stream);
//       console.log("🎤 Added track:", track);
//     } else {
//       console.warn("⚠ Track already added, skipping:", track);
//     }
//   });
//   peer.on("error", (error) => {
//     console.error("Peer connection error:", error);
//   });
//   peer.on("stream", (stream) => {
//     console.log("📡 [CALLER] Sending local stream:", stream);
//   });

//   peer.on("signal", async (data) => {
//     try {
//       const callId = [userId, remotePeerId].sort().join("_");

//       await setDoc(doc(db, "calls", callId), {
//         signalData: JSON.stringify(data),
//         from: userId,
//         to: remotePeerId,
//         timestamp: new Date().toISOString(),
//       });
//     } catch (error) {
//       console.error("Error sending signal data:", error);
//     }
//   });

//   return peer;
// };

// export const listenForCalls = (
//   db: Firestore,
//   userId: string,
//   callback: (callData: any) => void
// ) => {
//   const unsubscribe = onSnapshot(doc(db, "users", userId), (snapshot) => {
//     if (!snapshot.exists()) {
//       const peer = getPeer(userId, snapshot.id);
//       if (peer) {
//         peer.destroy();
//         activePeers.delete(snapshot.id);
//       }
//       return;
//     }

//     const userData = snapshot.data();
//     if (userData?.incomingCall) {
//       callback(userData.incomingCall);
//     }
//   });

//   return unsubscribe;
// };

// export const acceptCall = async (
//   db: Firestore,
//   callData: any,
//   localStream: MediaStream,
//   userId: string
// ) => {
//   try {
//     const peer = new Peer({
//       initiator: false,
//       trickle: false,
//       stream: localStream,
//       config: {
//         iceServers: [
//           { urls: "stun:stun.l.google.com:19302" },
//           {
//             urls: "turn:openrelay.metered.ca:80",
//             username: "openrelayproject",
//             credential: "openrelayproject",
//           },
//         ],
//       },
//     });

//     if (!callData?.signalData) {
//       console.error("❌ signalData tidak ditemukan dalam callData:", callData);
//       throw new Error("signalData tidak tersedia.");
//     }

//     const callId = [userId, callData.from].sort().join("_");
//     activePeers.set(callId, peer);

//     peer.signal(JSON.parse(callData.signalData));

//     peer.on("signal", async (data) => {
//       try {
//         const callId = [userId, callData.from].sort().join("_");
//         await updateDoc(doc(db, "calls", callId), {
//           answerSignal: JSON.stringify(data),
//           answered: true,
//         });
//         console.log("Answer signal sent:", data);
//       } catch (error) {
//         console.error("Error sending answer signal:", error);
//       }
//     });

//     await updateDoc(doc(db, "users", userId), {
//       incomingCall: null,
//     });

//     return peer;
//   } catch (error) {
//     console.error("Error accepting call:", error);
//     throw error;
//   }
// };

// export const initiateCall = async (
//   db: Firestore,
//   localStream: MediaStream,
//   userId: string,
//   recipientId: string,
//   isVideo: boolean
// ) => {
//   try {
//     const peer = createPeer(db, true, localStream, userId, recipientId);

//     await updateDoc(doc(db, "users", recipientId), {
//       incomingCall: {
//         from: userId,
//         isVideo,
//         timestamp: new Date().toISOString(),
//       },
//     });

//     const callId = [userId, recipientId].sort().join("_");
//     const unsubscribe = onSnapshot(doc(db, "calls", callId), (snapshot) => {
//       const callData = snapshot.data();
//       if (callData?.answered && callData?.answerSignal) {
//         peer.signal(JSON.parse(callData.answerSignal));

//         console.log("Call answered, signaling peer:", callData.answerSignal);
//         unsubscribe();
//       }
//     });

//     return peer;
//   } catch (error) {
//     console.error("Error initiating call:", error);
//     throw error;
//   }
// };

// const destroyPeer = (peer: Instance, callId: string) => {
//   if (!peer) return;

//   console.log(`Destroying peer connection for callId: ${callId}`);

//   peer.removeAllListeners();
//   peer.destroy();

//   setTimeout(() => {
//     if (!peer.destroyed) {
//       console.log(`Forcing destroy on peer: ${callId}`);
//       peer.destroy();
//     }
//     activePeers.delete(callId);
//   }, 1000);
// };

// export const endCall = async (
//   db: Firestore,
//   userId: string,
//   peerId: string
// ) => {
//   try {
//     const callId = [userId, peerId].sort().join("_");

//     await updateDoc(doc(db, "users", peerId), {
//       incomingCall: null,
//     });

//     await deleteDoc(doc(db, "calls", callId));

//     const peer = getPeer(userId, peerId);
//     if (peer) destroyPeer(peer, callId);
//     console.log("Call ended successfully");
//   } catch (error) {
//     console.error("Error ending call:", error);
//   }
// };

// import Peer from "simple-peer";
// import {
//   doc,
//   setDoc,
//   onSnapshot,
//   updateDoc,
//   deleteDoc,
//   type Firestore,
// } from "firebase/firestore";

// // Extend the Peer type to include the _localSignalCache property
// interface ExtendedPeer extends Peer.Instance {
//   _localSignalCache?: any;
// }

// // Function to create a WebRTC peer connection
// export const createPeer = (
//   db: Firestore,
//   initiator: boolean,
//   stream: MediaStream,
//   userId: string,
//   remotePeerId: string
// ) => {
//   const peer = new Peer({
//     initiator,
//     trickle: false,
//     stream,
//     config: {
//       iceServers: [
//         { urls: "stun:stun.l.google.com:19302" },
//         { urls: "stun:global.stun.twilio.com:3478" },
//       ],
//     },
//   }) as ExtendedPeer;

//   // Handle signaling data
//   peer.on("signal", async (data) => {
//     try {
//       // cache signaling
//       peer._localSignalCache = data;
//       // Create a unique call ID
//       const callId = [userId, remotePeerId].sort().join("_");

//       // Store the signaling data in Firestore
//       await setDoc(doc(db, "calls", callId), {
//         signalData: JSON.stringify(data),
//         from: userId,
//         to: remotePeerId,
//         timestamp: new Date().toISOString(),
//       });
//     } catch (error) {
//       console.error("Error sending signal data:", error);
//     }
//   });

//   // Log errors
//   peer.on("error", (err) => {
//     console.error("Peer connection error:", err);
//   });

//   return peer;
// };

// // Function to listen for incoming calls
// export const listenForCalls = (
//   db: Firestore,
//   userId: string,
//   callback: (callData: any) => void
// ) => {
//   // Listen for calls where the current user is the recipient
//   const unsubscribe = onSnapshot(doc(db, "users", userId), (snapshot) => {
//     const userData = snapshot.data();
//     if (userData?.incomingCall) {
//       callback(userData.incomingCall);
//     }
//   });

//   return unsubscribe;
// };

// // Function to accept an incoming call
// export const acceptCall = async (
//   db: Firestore,
//   callData: any,
//   localStream: MediaStream,
//   userId: string
// ) => {
//   try {
//     const peer = new Peer({
//       initiator: false,
//       trickle: false,
//       stream: localStream,
//       config: {
//         iceServers: [
//           { urls: "stun:stun.l.google.com:19302" },
//           { urls: "stun:global.stun.twilio.com:3478" },
//         ],
//       },
//     }) as ExtendedPeer;

//     // Signal the peer with the received signal data
//     setTimeout(() => {  peer.signal(JSON.parse(callData.signalData));
// }, 100);
//     // Handle signaling data
//     peer.on("signal", async (data) => {
//       try {
//         // Update the call document with answer signal
//         const callId = [userId, callData.from].sort().join("_");
//         await updateDoc(doc(db, "calls", callId), {
//           answerSignal: JSON.stringify(data),
//           answered: true,
//         });
//       } catch (error) {
//         console.error("Error sending answer signal:", error);
//       }
//     });

//     // Log errors
//     peer.on("error", (err) => {
//       console.error("Peer connection error:", err);
//     });

//     // Clear the incoming call notification
//     await updateDoc(doc(db, "users", userId), {
//       incomingCall: null,
//     });

//     return peer;
//   } catch (error) {
//     console.error("Error accepting call:", error);
//     throw error;
//   }
// };

// // Function to initiate a call
// export const initiateCall = async (
//   db: Firestore,
//   localStream: MediaStream,
//   userId: string,
//   recipientId: string,
//   isVideo: boolean
// ) => {
//   try {
//     // Create peer TANPA signal handler di dalam createPeer
//     const peer = new Peer({
//       initiator: true,
//       trickle: false,
//       stream: localStream,
//       config: {
//         iceServers: [
//           { urls: "stun:stun.l.google.com:19302" },
//           { urls: "stun:global.stun.twilio.com:3478" },
//         ],
//       },
//     }) as ExtendedPeer;

//     // Ini yang bener buat ngirim sinyal pertama kali ke lawan bicara
//     peer.on("signal", async (data) => {
//       const callId = [userId, recipientId].sort().join("_");

//       // Simpan signal offer di calls (buat reference answer nanti)
//       await setDoc(doc(db, "calls", callId), {
//         signalData: JSON.stringify(data),
//         from: userId,
//         to: recipientId,
//         timestamp: new Date().toISOString(),
//       });

//       // Kasih tahu user yang ditelpon
//       await updateDoc(doc(db, "users", recipientId), {
//         incomingCall: {
//           from: userId,
//           isVideo,
//           signalData: JSON.stringify(data),
//           timestamp: new Date().toISOString(),
//         },
//       });
//     });

//     // Dengerin kalau dia nerima (answerSignal muncul)
//     const callId = [userId, recipientId].sort().join("_");
//     const unsubscribe = onSnapshot(doc(db, "calls", callId), (snapshot) => {
//       const callData = snapshot.data();
//       if (callData?.answered && callData?.answerSignal) {
//         peer.signal(JSON.parse(callData.answerSignal));
//         unsubscribe();
//       }
//     });

//     return peer;
//   } catch (error) {
//     console.error("Error initiating call:", error);
//     throw error;
//   }
// };

// // Function to end a call
// export const endCall = async (
//   db: Firestore,
//   userId: string,
//   peerId: string
// ) => {
//   try {
//     const callId = [userId, peerId].sort().join("_");

//     // Delete the call document
//     await deleteDoc(doc(db, "calls", callId));

//     // Clear any incoming call notifications
//     await updateDoc(doc(db, "users", peerId), {
//       incomingCall: null,
//     });
//   } catch (error) {
//     console.error("Error ending call:", error);
//   }
// };

// import Peer from "simple-peer";
// import {
//   doc,
//   setDoc,
//   onSnapshot,
//   updateDoc,
//   deleteDoc,
//   type Firestore,
// } from "firebase/firestore";

// interface ExtendedPeer extends Peer.Instance {
//   _localSignalCache?: any;
// }

// export const createPeer = (
//   db: Firestore,
//   initiator: boolean,
//   stream: MediaStream,
//   userId: string,
//   remotePeerId: string
// ) => {
//   const peer = new Peer({
//     initiator,
//     trickle: false,
//     stream,
//     config: {
//       iceServers: [
//         { urls: "stun:stun.l.google.com:19302" },
//         { urls: "stun:global.stun.twilio.com:3478" },
//       ],
//     },
//   }) as ExtendedPeer;

//   peer.on("signal", async (data) => {
//     try {
//       peer._localSignalCache = data;
//       const callId = [userId, remotePeerId].sort().join("_");

//       await setDoc(doc(db, "calls", callId), {
//         signalData: JSON.stringify(data),
//         from: userId,
//         to: remotePeerId,
//         timestamp: new Date().toISOString(),
//       });
//     } catch (error) {
//       console.error("Error sending signal data:", error);
//     }
//   });

//   peer.on("error", (err) => {
//     console.error("Peer connection error:", err);
//   });

//   return peer;
// };

// export const listenForCalls = (
//   db: Firestore,
//   userId: string,
//   callback: (callData: any) => void
// ) => {
//   const unsubscribe = onSnapshot(doc(db, "users", userId), (snapshot) => {
//     const userData = snapshot.data();
//     if (userData?.incomingCall) {
//       callback(userData.incomingCall);
//     }
//   });

//   return unsubscribe;
// };

// export const acceptCall = async (
//   db: Firestore,
//   callData: any,
//   localStream: MediaStream,
//   userId: string
// ) => {
//   try {
//     const peer = new Peer({
//       initiator: false,
//       trickle: false,
//       stream: localStream,
//       config: {
//         iceServers: [
//           { urls: "stun:stun.l.google.com:19302" },
//           { urls: "stun:global.stun.twilio.com:3478" },
//         ],
//       },
//     }) as ExtendedPeer;

//     peer.signal(JSON.parse(callData.signalData));

//     peer.on("signal", async (data) => {
//       try {
//         const callId = [userId, callData.from].sort().join("_");
//         await updateDoc(doc(db, "calls", callId), {
//           answerSignal: JSON.stringify(data),
//           answered: true,
//         });
//       } catch (error) {
//         console.error("Error sending answer signal:", error);
//       }
//     });

//     peer.on("error", (err) => {
//       console.error("Peer connection error:", err);
//     });

//     await updateDoc(doc(db, "users", userId), {
//       incomingCall: null,
//     });

//     return peer;
//   } catch (error) {
//     console.error("Error accepting call:", error);
//     throw error;
//   }
// };

// export const initiateCall = async (
//   db: Firestore,
//   localStream: MediaStream,
//   userId: string,
//   recipientId: string,
//   isVideo: boolean
// ) => {
//   try {
//     const peer = createPeer(
//       db,
//       true,
//       localStream,
//       userId,
//       recipientId
//     ) as ExtendedPeer;

//     let signalData = "{}";

//     if (peer._localSignalCache) {
//       signalData = JSON.stringify(peer._localSignalCache);
//     }

//      peer.on("signal", async (data) => {
//   await updateDoc(doc(db, "users", recipientId), {
//     incomingCall: {
//       from: userId,
//       isVideo,
//       signalData: JSON.stringify(data),
//       timestamp: new Date().toISOString(),
//     },
//   });
// });

//    // await updateDoc(doc(db, "users", recipientId), {
//      // incomingCall: {
//        // from: userId,
//         // isVideo,
//        // signalData,
//        // timestamp: new Date().toISOString(),
//       // },
//    // });

//     const callId = [userId, recipientId].sort().join("_");
//     const unsubscribe = onSnapshot(doc(db, "calls", callId), (snapshot) => {
//       const callData = snapshot.data();
//       if (callData?.answered && callData?.answerSignal) {
//         peer.signal(JSON.parse(callData.answerSignal));
//         unsubscribe();
//       }
//     });

//     return peer;
//   } catch (error) {
//     console.error("Error initiating call:", error);
//     throw error;
//   }
// };

// export const endCall = async (
//   db: Firestore,
//   userId: string,
//   peerId: string
// ) => {
//   try {
//     const callId = [userId, peerId].sort().join("_");

//     await deleteDoc(doc(db, "calls", callId));

//     await updateDoc(doc(db, "users", peerId), {
//       incomingCall: null,
//     });
//   } catch (error) {
//     console.error("Error ending call:", error);
//   }
// };

"use client";

// Legacy compatibility layer for existing code
// This file provides backward compatibility while using the new WebRTC implementation

import {
  initializeWebRTC,
  getWebRTCManager,
  type Firestore,
} from "./webrtc-native";

// Initialize WebRTC manager for legacy compatibility
let isInitialized = false;

const ensureInitialized = (db: Firestore, userId: string) => {
  if (!isInitialized) {
    initializeWebRTC(db, userId);
    isInitialized = true;
  }
};

// Legacy function: Listen for calls
export const listenForCalls = (
  db: Firestore,
  userId: string,
  callback: (callData: any) => void
) => {
  ensureInitialized(db, userId);
  const manager = getWebRTCManager();

  if (manager) {
    return manager.listenForIncomingCalls(callback);
  }

  return () => {}; // Empty unsubscribe function
};

// Legacy function: Initiate call
export const initiateCall = async (
  db: Firestore,
  localStream: MediaStream, // This parameter is ignored in new implementation
  userId: string,
  recipientId: string,
  isVideo: boolean
) => {
  ensureInitialized(db, userId);
  const manager = getWebRTCManager();

  if (!manager) {
    throw new Error("WebRTC manager not initialized");
  }

  const callId = await manager.initiateCall(recipientId, isVideo);

  // Return a mock peer object for compatibility
  return {
    on: (event: string, callback: Function) => {
      if (event === "stream") {
        window.addEventListener("webrtc-remotestream", (e: any) => {
          callback(e.detail.stream);
        });
      }
    },
    destroy: () => manager.endCall(),
    streams: [], // Mock streams array
  };
};

// Legacy function: Accept call
export const acceptCall = async (
  db: Firestore,
  callData: any,
  localStream: MediaStream, // This parameter is ignored in new implementation
  userId: string
) => {
  ensureInitialized(db, userId);
  const manager = getWebRTCManager();

  if (!manager) {
    throw new Error("WebRTC manager not initialized");
  }

  // Extract callId from callData
  const callId = callData.callId || `${callData.from}_${userId}_${Date.now()}`;

  await manager.answerCall(callId);

  // Return a mock peer object for compatibility
  return {
    on: (event: string, callback: Function) => {
      if (event === "stream") {
        window.addEventListener("webrtc-remotestream", (e: any) => {
          callback(e.detail.stream);
        });
      }
    },
    destroy: () => manager.endCall(),
    streams: [], // Mock streams array
  };
};

// Legacy function: End call
export const endCall = async (
  db: Firestore,
  userId: string,
  peerId: string
) => {
  const manager = getWebRTCManager();

  if (manager) {
    await manager.endCall();
  }
};

// Export new implementation for direct use
export * from "./webrtc-native";
