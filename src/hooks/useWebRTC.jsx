import { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import toast from 'react-hot-toast';
import userAtom from '../atoms/userAtom';
import { useSocket } from '../context/SocketContext';
import ringOutUrl from '../assets/sounds/msgSound.wav';
import ringInUrl  from '../assets/sounds/incomeRing.mp3';
const RING_OUT_URL = ringOutUrl; // caller side ringtone
const RING_IN_URL  = ringInUrl;  // receiver side ringtone

const useWebRTC = () => {
  const user = useRecoilValue(userAtom);
  const { socket } = useSocket();

  const [localStream, setLocalStream] = useState(null);
  const [calling, setCalling] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState({});
  const [signal, setSignal] = useState(null);
  const [currentCallType, setCurrentCallType] = useState('audio');

  const userVideo = useRef();
  const partnerVideo = useRef();
  const partnerAudio = useRef();
  const peerConnection = useRef(null);

  // NEW: who is the other party? (works for both caller/receiver)
  const peerIdRef = useRef(null);

  // SDP/ICE ordering helpers
  const remoteDescSetRef = useRef(false);
  const pendingRemoteICERef = useRef([]);

  // Toast flood guard
  const incomingToastLockRef = useRef(false);
  const incomingToastIdRef = useRef(null);

  // NEW: ringtones
  const ringOutRef = useRef(null);
  const ringInRef = useRef(null);

  const isSecure = typeof window !== "undefined" && window.isSecureContext;

  // --- ringtone helpers ---
  const ensureRingers = () => {
    if (!ringOutRef.current) {
      ringOutRef.current = new Audio(RING_OUT_URL);
      ringOutRef.current.loop = true;
      ringOutRef.current.preload = 'auto';
      ringOutRef.current.volume = 1;
    }
    if (!ringInRef.current) {
      ringInRef.current = new Audio(RING_IN_URL);
      ringInRef.current.loop = true;
      ringInRef.current.preload = 'auto';
      ringInRef.current.volume = 1;
    }
  };
  const playRingOut = () => { try { ensureRingers(); ringOutRef.current?.play(); } catch {} };
  const stopRingOut = () => { try { ringOutRef.current?.pause(); ringOutRef.current.currentTime = 0; } catch {} };
  const playRingIn  = () => { try { ensureRingers(); ringInRef.current?.play(); } catch {} };
  const stopRingIn  = () => { try { ringInRef.current?.pause(); ringInRef.current.currentTime = 0; } catch {} };

  const endCurrentStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

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
      let timer;
      const onIncoming = ({ signal: s }) => {
        if (s?.type === 'offer') {
          setSignal(s);
          socket?.off("incomingCall", onIncoming);
          clearTimeout(timer);
          resolve(s);
        }
      };
      socket?.on("incomingCall", onIncoming);
      timer = setTimeout(() => {
        socket?.off("incomingCall", onIncoming);
        reject(new Error("OfferTimeout"));
      }, 7000);
    });

  // ontrack: set remote media
  const attachOnTrack = (pc) => {
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (event.track.kind === "video" && partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
        partnerVideo.current.playsInline = true;
      }
      if (event.track.kind === "audio") {
        const el = partnerAudio.current || new Audio();
        el.srcObject = stream;
        el.autoplay = true;
        el.play?.().catch(() => {});
        if (!partnerAudio.current) partnerAudio.current = el;
      }
    };
  };

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onIncomingCall = ({ signal: sig, from, name, callType }) => {
      // receiver: set peerId
      peerIdRef.current = from;

      if (!incomingToastLockRef.current) {
        incomingToastLockRef.current = true;
        playRingIn();

        incomingToastIdRef.current = toast.custom((t) => (
          <div className="bg-gray-800 text-white p-4 rounded-md shadow-lg">
            <p>📞 Incoming {callType || 'audio'} call from {name}</p>
            <button
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md mt-2 mr-2"
              onClick={() => { acceptCall(callType || 'audio'); toast.dismiss(t.id); }}
            >
              Accept
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md mt-2"
              onClick={() => { endCall(true); toast.dismiss(t.id); }}  // remote=true? here we just locally end without echo
            >
              Reject
            </button>
          </div>
        ), { duration: 7000 });
        setTimeout(() => { incomingToastLockRef.current = false; }, 7000);
      }

      setReceivingCall(true);
      setCaller({ id: from, name });
      setCurrentCallType(callType || 'audio');

      if (sig?.type) setSignal(sig);
      else if (sig?.candidate) pendingRemoteICERef.current.push(sig);
    };

    const onCallAccepted = async (remoteSignal) => {
      setCallAccepted(true);
      stopRingOut(); // outgoing ring stops when accepted
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
      // IMPORTANT: remote end → don't echo back
      endCall(true);
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
      incomingToastLockRef.current = false;
      const id = incomingToastIdRef.current;
      if (id) toast.dismiss(id);
      incomingToastIdRef.current = null;
      stopRingIn();
      stopRingOut();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const startCall = async (toUserId, callType) => {
    console.log(`[WebRTC] Initiating call to ${toUserId} (${callType})`);
    setCalling(true);
    setCurrentCallType(callType);
    // caller: set peerId here (BUG FIX)
    peerIdRef.current = toUserId;

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
        userVideo.current.autoplay = true;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnection.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      attachOnTrack(pc);

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

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // play outgoing ring while waiting answer
      playRingOut();

      socket?.emit("callUser", {
        userToCall: toUserId,
        signalData: offer,
        from: user._id,
        name: user.username,
        callType
      });
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

    stopRingIn(); // stop incoming ringtone

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
        userVideo.current.autoplay = true;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnection.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      attachOnTrack(pc);

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("answerCall", {
            signal: event.candidate,
            to: peerIdRef.current || caller.id // double safety
          });
        }
      };

      // Ensure we have offer first
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

      socket?.emit("answerCall", {
        signal: answer,
        to: peerIdRef.current || caller.id
      });
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

  // remote=true means "this endCall is triggered by remote event; don't echo"
  const endCall = (remote = false) => {
    stopRingIn();
    stopRingOut();

    // Only emit if this user is actively ending the call
    if (!remote && socket && peerIdRef.current) {
      socket.emit("endCall", { to: peerIdRef.current });
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
    peerIdRef.current = null;

    incomingToastLockRef.current = false;
    if (incomingToastIdRef.current) {
      toast.dismiss(incomingToastIdRef.current);
      incomingToastIdRef.current = null;
    }
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
    partnerAudio,
    acceptCall,
    currentCallType,
  };
};

export default useWebRTC;
