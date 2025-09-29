// hooks/useWebRTC.js
import { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import toast from 'react-hot-toast';
import userAtom from '../atoms/userAtom';
import { useSocket } from '../context/SocketContext';

const useWebRTC = () => {
  const user = useRecoilValue(userAtom);
  const { socket } = useSocket();        // ← use the single socket instance from context
  const [localStream, setLocalStream] = useState(null);
  const [calling, setCalling] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState({});
  const [signal, setSignal] = useState(null);
  const [currentCallType, setCurrentCallType] = useState('audio');

  const userVideo = useRef();
  const partnerVideo = useRef();
  const peerConnection = useRef(null);

  const endCurrentStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  // Socket listeners (single place)
  useEffect(() => {
    if (!socket) return;

    const onIncomingCall = ({ signal, from, name, callType }) => {
      console.log(`[WebRTC] 'incomingCall' from ${name}, type: ${callType}`);
      setReceivingCall(true);
      setCaller({ id: from, name });
      setSignal(signal);
      setCurrentCallType(callType || 'audio');

      // Non-intrusive toast — design stays the same outside
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

    const onCallAccepted = (remoteSignal) => {
      setCallAccepted(true);
      if (peerConnection.current) {
        // If using simple SDP pass-through, set as remote description when appropriate
        try {
          if (remoteSignal?.type) {
            peerConnection.current.setRemoteDescription(new RTCSessionDescription(remoteSignal));
          } else if (remoteSignal?.candidate) {
            peerConnection.current.addIceCandidate(new RTCIceCandidate(remoteSignal));
          }
        } catch (e) {
          console.error("Error applying callAccepted signal:", e);
        }
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
  }, [socket]); // keep listeners bound to the single socket

  const startCall = async (toUserId, callType) => {
    console.log(`[WebRTC] Initiating call to user: ${toUserId} with type: ${callType}`);
    setCalling(true);
    setCurrentCallType(callType);
    endCurrentStream();
    peerConnection.current = null;

    const mediaConstraints = callType === "audio" ? { video: false, audio: true } : { video: true, audio: true };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      setLocalStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }

      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate && socket) {
          // Send ICE candidates to callee
          socket.emit("callUser", {
            userToCall: toUserId,
            signalData: event.candidate,
            from: user._id,
            name: user.username,
            callType
          });
        }
      };

      peerConnection.current.ontrack = (event) => {
        partnerVideo.current.srcObject = event.streams[0];
      };

      // Offer (SDP)
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
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
      toast.error("Access to camera/microphone denied.");
      console.error("getUserMedia error: ", err);
      endCall();
    }
  };

  const acceptCall = async (callType) => {
    setCallAccepted(true);
    setCurrentCallType(callType);
    endCurrentStream();
    peerConnection.current = null;

    const mediaConstraints = callType === "audio" ? { video: false, audio: true } : { video: true, audio: true };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      setLocalStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }

      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("answerCall", {
            signal: event.candidate,
            to: caller.id
          });
        }
      };

      peerConnection.current.ontrack = (event) => {
        partnerVideo.current.srcObject = event.streams[0];
      };

      // Apply caller's SDP offer first
      if (signal?.type) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal?.candidate) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal));
      }

      // Answer (SDP)
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      if (socket) {
        socket.emit("answerCall", {
          signal: answer,
          to: caller.id
        });
      }
    } catch (err) {
      toast.error("Access to camera/microphone denied.");
      console.error("getUserMedia error: ", err);
      endCall();
    }
  };

  const endCall = () => {
    if (socket && caller?.id) {
      socket.emit("endCall", { to: caller.id });
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    endCurrentStream();
    setCalling(false);
    setCallAccepted(false);
    setReceivingCall(false);
    setCaller({});
    setSignal(null);
    setCurrentCallType('audio');
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
    acceptCall,
    currentCallType,
  };
};

export default useWebRTC;
