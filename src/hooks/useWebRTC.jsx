import { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import toast from 'react-hot-toast';
import userAtom from '../atoms/userAtom';
import { useSocket } from '../context/SocketContext';

const useWebRTC = () => {
  const user = useRecoilValue(userAtom);
  const { socket } = useSocket();        // single socket instance from context

  const [localStream, setLocalStream] = useState(null);
  const [calling, setCalling] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState({});
  const [signal, setSignal] = useState(null);
  const [currentCallType, setCurrentCallType] = useState('audio');

  const userVideo = useRef();
  const partnerVideo = useRef();
  const partnerAudio = useRef(); // NEW: remote audio element
  const peerConnection = useRef(null);

  // SDP/ICE ordering helpers (kept for stability)
  const remoteDescSetRef = useRef(false);
  const pendingRemoteICERef = useRef([]);

  const isSecure = typeof window !== "undefined" && window.isSecureContext;

  const endCurrentStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  // media helper with fallbacks
  const getMedia = async (callType) => {
    if (!isSecure) {
      const err = Object.assign(new Error("Insecure context"), { name: "InsecureContextError" });
      throw err;
    }
    const wantVideo = callType === "video";
    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true },
      video: wantVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    };
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      switch (err.name) {
        case "NotFoundError":
        case "OverconstrainedError":
          if (wantVideo) {
            // fallback to audio-only
            return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          }
          throw err;
        case "NotReadableError":
          toast.error("Your mic/camera seems to be in use by another app.");
          if (wantVideo) {
            return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          }
          throw err;
        default:
          throw err;
      }
    }
  };

  const safeAddIce = async (pc, cand) => {
    if (!pc) return;
    if (!pc.remoteDescription || !remoteDescSetRef.current) {
      pendingRemoteICERef.current.push(cand);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(cand));
    } catch (e) {
      console.error("addIceCandidate failed:", e);
    }
  };

  const flushPendingICE = async (pc) => {
    if (!pc) return;
    const list = pendingRemoteICERef.current;
    pendingRemoteICERef.current = [];
    for (const cand of list) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.error("flush addIceCandidate failed:", e);
      }
    }
  };

  const waitForOffer = () =>
    new Promise((resolve, reject) => {
      if (signal?.type === 'offer') return resolve(signal);
      const onIncoming = ({ signal: s }) => {
        if (s?.type === 'offer') {
          setSignal(s);
          socket?.off("incomingCall", onIncoming);
          resolve(s);
        }
      };
      socket?.on("incomingCall", onIncoming);
      const timer = setTimeout(() => {
        socket?.off("incomingCall", onIncoming);
        reject(new Error("OfferTimeout"));
      }, 7000);
    });

  // Socket listeners (single place)
  useEffect(() => {
    if (!socket) return;

    const onIncomingCall = ({ signal, from, name, callType }) => {
      console.log(`[WebRTC] 'incomingCall' from ${name}, type: ${callType}`);
      setReceivingCall(true);
      setCaller({ id: from, name });
      setCurrentCallType(callType || 'audio');

      if (signal?.type) {
        setSignal(signal);             // SDP (offer expected)
      } else if (signal?.candidate) {
        pendingRemoteICERef.current.push(signal); // early ICE → buffer
      }

      toast.custom((t) => (
        <div className="bg-gray-800 text-white p-4 rounded-md shadow-lg">
          <p>Incoming {callType || 'audio'} call from {name}</p>
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md mt-2 mr-2"
            onClick={() => { acceptCall(callType || 'audio'); toast.dismiss(t.id); }}
          >
            Accept
          </button>
          <button
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md mt-2"
            onClick={() => { endCall(); toast.dismiss(t.id); }}
          >
            Reject
          </button>
        </div>
      ));
    };

    const onCallAccepted = async (remoteSignal) => {
      setCallAccepted(true);
      const pc = peerConnection.current;
      if (!pc) return;
      try {
        if (remoteSignal?.type) {
          await pc.setRemoteDescription(new RTCSessionDescription(remoteSignal));
          remoteDescSetRef.current = true;
          await flushPendingICE(pc);
        } else if (remoteSignal?.candidate) {
          await safeAddIce(pc, remoteSignal);
        }
      } catch (e) {
        console.error("Error applying callAccepted signal:", e);
      }
    };

    const onCallEnded = () => {
      endCall();
      toast.error("Call ended.");
    };

    socket.on("incomingCall", onIncomingCall);
    socket.on("callAccepted", onCallAccepted);
    socket.on("callEnded", onCallEnded);

    return () => {
      socket.off("incomingCall", onIncomingCall);
      socket.off("callAccepted", onCallAccepted);
      socket.off("callEnded", onCallEnded);
      endCurrentStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Common ontrack handler: route video to video element, audio to audio element
  const attachOnTrack = (pc) => {
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (event.track.kind === "video" && partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
      }
      if (event.track.kind === "audio" && partnerAudio.current) {
        partnerAudio.current.srcObject = stream;
        // try autoplay (user gesture usually exists after accept/click)
        partnerAudio.current.play?.().catch(() => { /* ignore autoplay errors */ });
      }
    };
  };

  const startCall = async (toUserId, callType) => {
    console.log(`[WebRTC] Initiating call to user: ${toUserId} with type: ${callType}`);
    setCalling(true);
    setCurrentCallType(callType);
    endCurrentStream();
    peerConnection.current = null;
    remoteDescSetRef.current = false;
    pendingRemoteICERef.current = [];

    try {
      const stream = await getMedia(callType);
      setLocalStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
        userVideo.current.muted = true;
        userVideo.current.playsInline = true;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnection.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("callUser", {
            userToCall: toUserId,
            signalData: event.candidate,
            from: user._id,
            name: user.username,
            callType
          });
        }
      };

      attachOnTrack(pc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (socket) {
        socket.emit("callUser", {
          userToCall: toUserId,
          signalData: offer,
          from: user._id,
          name: user.username,
          callType
        });
      }
    } catch (err) {
      console.error("getUserMedia error (startCall): ", err);
      if (err.name === "InsecureContextError") {
        toast.error("Use HTTPS (or localhost) to access camera/mic.");
      } else if (err.name === "NotAllowedError") {
        toast.error("Please allow camera/mic for this site and retry.");
      } else {
        toast.error("Unable to access camera/microphone.");
      }
      endCall();
    }
  };

  const acceptCall = async (callType) => {
    console.log(`[WebRTC] acceptCall (${callType})`);
    setCallAccepted(true);
    setCurrentCallType(callType);
    endCurrentStream();
    peerConnection.current = null;
    remoteDescSetRef.current = false;
    pendingRemoteICERef.current = [];

    try {
      const stream = await getMedia(callType);
      setLocalStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
        userVideo.current.muted = true;
        userVideo.current.playsInline = true;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnection.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("answerCall", {
            signal: event.candidate,
            to: caller.id
          });
        }
      };

      attachOnTrack(pc);

      // Ensure we have caller's offer before answering
      let offer = signal?.type === 'offer' ? signal : null;
      if (!offer) {
        try {
          offer = await waitForOffer();
        } catch {
          toast.error("Call offer not received yet. Please try again.");
          endCall();
          return;
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      remoteDescSetRef.current = true;
      await flushPendingICE(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (socket) {
        socket.emit("answerCall", {
          signal: answer,
          to: caller.id
        });
      }
    } catch (err) {
      console.error("getUserMedia error (acceptCall): ", err);
      if (err.name === "InsecureContextError") {
        toast.error("Use HTTPS (or localhost) to access camera/mic.");
      } else if (err.name === "NotAllowedError") {
        toast.error("Please allow camera/mic for this site and retry.");
      } else {
        toast.error("Unable to access camera/microphone.");
      }
      endCall();
    }
  };

  const endCall = () => {
    if (socket && caller?.id) {
      socket.emit("endCall", { to: caller.id });
    }
    if (peerConnection.current) {
      try { peerConnection.current.close(); } catch {}
      peerConnection.current = null;
    }
    endCurrentStream();
    setCalling(false);
    setCallAccepted(false);
    setReceivingCall(false);
    setCaller({});
    setSignal(null);
    setCurrentCallType('audio');
    remoteDescSetRef.current = false;
    pendingRemoteICERef.current = [];
  };

  return {
    isCalling: calling,
    isCallAccepted: callAccepted,
    isReceivingCall: receivingCall,
    caller,
    startCall,
    endCall,
    userVideo,
    partnerVideo,
    partnerAudio,  // NEW: expose ref
    acceptCall,
    currentCallType,
  };
};

export default useWebRTC;
