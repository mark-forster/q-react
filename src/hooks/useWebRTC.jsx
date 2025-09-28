// hooks/useWebRTC.js
import { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import userAtom from '../atoms/userAtom';

const API_BASE = import.meta.env.VITE_API_URL || '';
const socket = io(API_BASE, {
  query: {
    userId: localStorage.getItem('user-threads') ? JSON.parse(localStorage.getItem('user-threads'))._id : '',
  },
});

const useWebRTC = () => {
  const user = useRecoilValue(userAtom);
  const [localStream, setLocalStream] = useState(null);
  const [calling, setCalling] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState({});
  const [signal, setSignal] = useState(null);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const peerConnection = useRef(null);

  useEffect(() => {
    socket.on("incomingCall", ({ signal, from, name }) => {
      console.log(`[WebRTC] 'incomingCall' event received from user: ${name}`);
      setReceivingCall(true);
      setCaller({ id: from, name });
      setSignal(signal);
      toast.custom((t) => (
        <div className="bg-gray-800 text-white p-4 rounded-md shadow-lg">
          <p>Incoming call from {name}</p>
          <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md mt-2 mr-2" onClick={() => {
            acceptCall();
            toast.dismiss(t.id);
          }}>Accept</button>
          <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md mt-2" onClick={() => {
            endCall();
            toast.dismiss(t.id);
          }}>Reject</button>
        </div>
      ));
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      if (peerConnection.current) {
        peerConnection.current.signal(signal);
      }
    });

    socket.on("callEnded", () => {
      endCall();
      toast.error("Call ended.");
    });

    return () => {
      socket.off("incomingCall");
      socket.off("callAccepted");
      socket.off("callEnded");
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  const startCall = async (toUserId, callType) => {
    console.log(`[WebRTC] Initiating call to user: ${toUserId} with type: ${callType}`);
    setCalling(true);
    
    // Get user media based on call type
    const mediaConstraints = callType === "audio" ? { video: false, audio: true } : { video: true, audio: true };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      setLocalStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    } catch (err) {
      toast.error("Access to camera/microphone denied.");
      console.error("getUserMedia error: ", err);
      return;
    }

    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    if (localStream) {
      localStream.getTracks().forEach(track => peerConnection.current.addTrack(track, localStream));
    }

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("callUser", {
          userToCall: toUserId,
          signalData: event.candidate,
          from: user._id,
          name: user.username,
        });
      }
    };

    peerConnection.current.ontrack = (event) => {
      partnerVideo.current.srcObject = event.streams[0];
    };

    peerConnection.current.createOffer().then(offer => {
      peerConnection.current.setLocalDescription(offer);
      socket.emit("callUser", {
        userToCall: toUserId,
        signalData: offer,
        from: user._id,
        name: user.username,
      });
    });
  };

  const acceptCall = async (callType) => {
    setCallAccepted(true);

    // Get user media based on call type
    const mediaConstraints = callType === "audio" ? { video: false, audio: true } : { video: true, audio: true };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      setLocalStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    } catch (err) {
      toast.error("Access to camera/microphone denied.");
      console.error("getUserMedia error: ", err);
      return;
    }
    
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    if (localStream) {
      localStream.getTracks().forEach(track => peerConnection.current.addTrack(track, localStream));
    }

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("answerCall", {
          signal: event.candidate,
          to: caller.id
        });
      }
    };

    peerConnection.current.ontrack = (event) => {
      partnerVideo.current.srcObject = event.streams[0];
    };

    peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal)).then(() => {
      peerConnection.current.createAnswer().then(answer => {
        peerConnection.current.setLocalDescription(answer);
        socket.emit("answerCall", {
          signal: answer,
          to: caller.id
        });
      });
    });
  };

  const endCall = () => {
    socket.emit("endCall", { to: caller.id });
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setCalling(false);
    setCallAccepted(false);
    setReceivingCall(false);
    setCaller({});
    setSignal(null);
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
    acceptCall
  };
};

export default useWebRTC;