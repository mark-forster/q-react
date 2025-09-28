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
  const [stream, setStream] = useState(null);
  const [calling, setCalling] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState({});
  const [signal, setSignal] = useState(null);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const peerConnection = useRef(null);

  useEffect(() => {
    // 1. Get user media (camera/mic)
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(currentStream => {
        setStream(currentStream);
        if (userVideo.current) {
          userVideo.current.srcObject = currentStream;
        }
      })
      .catch(err => {
        toast.error("Access to camera/microphone denied.");
        console.error("getUserMedia error: ", err);
      });

    // 2. Listen for incoming calls
    socket.on("incomingCall", ({ signal, from, name }) => {
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

    // 3. Listen for call accepted
    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      if (peerConnection.current) {
        peerConnection.current.signal(signal);
      }
    });

    // 4. Listen for call ended
    socket.on("callEnded", () => {
      endCall();
      toast.error("Call ended.");
    });

    return () => {
      socket.off("incomingCall");
      socket.off("callAccepted");
      socket.off("callEnded");
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCall = (toUserId) => {
    setCalling(true);
    
    // Create Peer Connection
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Public STUN server
      ]
    });

    // Add user's stream to peer connection
    if (stream) {
      stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));
    }

    // Handle peer connection events
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

    // Create and send offer
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

  const acceptCall = () => {
    setCallAccepted(true);
    
    // Create Peer Connection
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    // Add user's stream to peer connection
    if (stream) {
      stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));
    }

    // Handle peer connection events
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

    // Set remote description and create answer
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
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
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
  };
};

export default useWebRTC;