import Peer, { Instance } from "simple-peer";
import {
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  type Firestore,
} from "firebase/firestore";

const activePeers = new Map<string, Instance>();

const getPeer = (
  userId: string,
  remotePeerId: string
): Instance | undefined => {
  const callId = [userId, remotePeerId].sort().join("_");
  return activePeers.get(callId);
};

export const createPeer = (
  db: Firestore,
  initiator: boolean,
  stream: MediaStream,
  userId: string,
  remotePeerId: string
) => {
  console.log("initiator stream", stream);

  const peer = new Peer({
    initiator,
    trickle: false,
    stream,
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
    },
  });

  const callId = [userId, remotePeerId].sort().join("_");

  activePeers.set(callId, peer);

  stream.getTracks().forEach((track) => {
    if (!peer.streams[0]?.getTracks().includes(track)) {
      peer.addTrack(track, stream);
      console.log("🎤 Added track:", track);
    } else {
      console.warn("⚠ Track already added, skipping:", track);
    }
  });
  peer.on("error", (error) => {
    console.error("Peer connection error:", error);
  });
  peer.on("stream", (stream) => {
    console.log("📡 [CALLER] Sending local stream:", stream);
  });

  peer.on("signal", async (data) => {
    try {
      const callId = [userId, remotePeerId].sort().join("_");

      await setDoc(doc(db, "calls", callId), {
        signalData: JSON.stringify(data),
        from: userId,
        to: remotePeerId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error sending signal data:", error);
    }
  });

  return peer;
};

export const listenForCalls = (
  db: Firestore,
  userId: string,
  callback: (callData: any) => void
) => {
  const unsubscribe = onSnapshot(doc(db, "users", userId), (snapshot) => {
    if (!snapshot.exists()) {
      const peer = getPeer(userId, snapshot.id);
      if (peer) {
        peer.destroy();
        activePeers.delete(snapshot.id);
      }
      return;
    }

    const userData = snapshot.data();
    if (userData?.incomingCall) {
      callback(userData.incomingCall);
    }
  });

  return unsubscribe;
};

export const acceptCall = async (
  db: Firestore,
  callData: any,
  localStream: MediaStream,
  userId: string
) => {
  try {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: localStream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      },
    });

    if (!callData?.signalData) {
      console.error("❌ signalData tidak ditemukan dalam callData:", callData);
      throw new Error("signalData tidak tersedia.");
    }

    const callId = [userId, callData.from].sort().join("_");
    activePeers.set(callId, peer);

    peer.signal(JSON.parse(callData.signalData));

    peer.on("signal", async (data) => {
      try {
        const callId = [userId, callData.from].sort().join("_");
        await updateDoc(doc(db, "calls", callId), {
          answerSignal: JSON.stringify(data),
          answered: true,
        });
        console.log("Answer signal sent:", data);
      } catch (error) {
        console.error("Error sending answer signal:", error);
      }
    });

    await updateDoc(doc(db, "users", userId), {
      incomingCall: null,
    });

    return peer;
  } catch (error) {
    console.error("Error accepting call:", error);
    throw error;
  }
};

export const initiateCall = async (
  db: Firestore,
  localStream: MediaStream,
  userId: string,
  recipientId: string,
  isVideo: boolean
) => {
  try {
    const peer = createPeer(db, true, localStream, userId, recipientId);

    await updateDoc(doc(db, "users", recipientId), {
      incomingCall: {
        from: userId,
        isVideo,
        timestamp: new Date().toISOString(),
      },
    });

    const callId = [userId, recipientId].sort().join("_");
    const unsubscribe = onSnapshot(doc(db, "calls", callId), (snapshot) => {
      const callData = snapshot.data();
      if (callData?.answered && callData?.answerSignal) {
        peer.signal(JSON.parse(callData.answerSignal));

        console.log("Call answered, signaling peer:", callData.answerSignal);
        unsubscribe();
      }
    });

    return peer;
  } catch (error) {
    console.error("Error initiating call:", error);
    throw error;
  }
};

const destroyPeer = (peer: Instance, callId: string) => {
  if (!peer) return;

  console.log(`Destroying peer connection for callId: ${callId}`);

  peer.removeAllListeners();
  peer.destroy();

  setTimeout(() => {
    if (!peer.destroyed) {
      console.log(`Forcing destroy on peer: ${callId}`);
      peer.destroy();
    }
    activePeers.delete(callId);
  }, 1000);
};

export const endCall = async (
  db: Firestore,
  userId: string,
  peerId: string
) => {
  try {
    const callId = [userId, peerId].sort().join("_");

    await updateDoc(doc(db, "users", peerId), {
      incomingCall: null,
    });

    await deleteDoc(doc(db, "calls", callId));

    const peer = getPeer(userId, peerId);
    if (peer) destroyPeer(peer, callId);
    console.log("Call ended successfully");
  } catch (error) {
    console.error("Error ending call:", error);
  }
};
