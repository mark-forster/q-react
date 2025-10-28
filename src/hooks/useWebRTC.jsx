import { useEffect, useRef, useState, useCallback } from "react";
import { useRecoilValue } from "recoil";
import toast from "react-hot-toast";
import userAtom from "../atoms/userAtom";
import { useSocket } from "../context/SocketContext";
import ringOutUrl from "../assets/sounds/msgSound.wav";
import ringInUrl from "../assets/sounds/incomeRing.mp3";
import axios from "axios";

// Zego SDK
import { ZegoExpressEngine } from "zego-express-engine-webrtc";

const ZEGO_APP_ID = 153980135; 

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

const RING_OUT_URL = ringOutUrl; // caller side ringtone
const RING_IN_URL = ringInUrl;   // receiver side ringtone

const useWebRTC = () => {
  const user = useRecoilValue(userAtom);
  const { socket } = useSocket();

  const [localStream, setLocalStream] = useState(null);
  const [calling, setCalling] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState({});
  const [currentCallType, setCurrentCallType] = useState("audio");
  const [remoteStreamList, setRemoteStreamList] = useState([]); // Array of { streamID, stream }

  const userVideo = useRef(null);
  const partnerVideo = useRef(null);
  const partnerAudio = useRef(null);

  const zgEngine = useRef(null);
  const partnerIdRef = useRef(null);

  const incomingToastLockRef = useRef(false);
  const incomingToastIdRef = useRef(null);

  const ringOutRef = useRef(null);
  const ringInRef = useRef(null);

  const resetCallState = useCallback(() => {
    if (incomingToastIdRef.current) {
      toast.dismiss(incomingToastIdRef.current);
      incomingToastIdRef.current = null;
    }
    setCalling(false);
    setCallAccepted(false);
    setReceivingCall(false);
    setCaller({});
    setCurrentCallType("audio");
    partnerIdRef.current = null;
    setRemoteStreamList([]);
    incomingToastLockRef.current = false;
  }, []);

  const endCurrentStream = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
  }, [localStream]);

  const ensureRingers = () => {
    if (!ringOutRef.current) {
      ringOutRef.current = new Audio(RING_OUT_URL);
      ringOutRef.current.loop = true;
      ringOutRef.current.preload = "auto";
      ringOutRef.current.volume = 1;
    }
    if (!ringInRef.current) {
      ringInRef.current = new Audio(RING_IN_URL);
      ringInRef.current.loop = true;
      ringInRef.current.preload = "auto";
      ringInRef.current.volume = 1;
    }
  };
  const playRingOut = () => { try { ensureRingers(); ringOutRef.current?.play(); } catch {} };
  const stopRingOut = () => { try { ringOutRef.current?.pause(); ringOutRef.current.currentTime = 0; } catch {} };
  const playRingIn  = () => { try { ensureRingers(); ringInRef.current?.play(); } catch {} };
  const stopRingIn  = () => { try { ringInRef.current?.pause(); ringInRef.current.currentTime = 0; } catch {} };

  // 1. 🛑🛑🛑 endCall FUNCTION (Reject Logic ပေါင်းစပ်ထားသည်) 🛑🛑🛑
  const endCall = useCallback((remote = false, isReject = false) => {
    
    // Stop ringing
    stopRingIn();
    stopRingOut();

    // 1. Socket Signaling Logic
    const currentPartnerId = partnerIdRef.current || (caller && caller.id);
    if (!remote && !isReject && socket && currentPartnerId) { 
      // ကိုယ်တိုင်ချလိုက်ရင် partner ကို အကြောင်းကြား
      socket.emit("endCall", { to: currentPartnerId });
    } else if (isReject && socket && currentPartnerId) {
      // Reject လုပ်လိုက်ရင် caller ကို အကြောင်းကြား
      socket.emit("callRejected", { to: currentPartnerId });
    }

    // 2. Zego Cleanup Logic
    if (zgEngine.current) {
      // roomID ကို partnerIdRef သို့မဟုတ် caller.roomID ကနေ ယူပါ
      const currentRoomID = partnerIdRef.current
        ? [user._id, partnerIdRef.current].sort().join("_")
        : (caller && caller.roomID);

      if (localStream && currentRoomID) {
        const localStreamID = `${user._id}_${currentRoomID}_${currentCallType}`;
        try { zgEngine.current.stopPublishingStream(localStreamID); } catch {}
      }

      try { 
        remoteStreamList.forEach((item) => {
          // stop playing
          zgEngine.current.stopPlayingStream(item.streamID);
          // clean up video/audio elements
          if (partnerVideo.current && partnerVideo.current.srcObject === item.stream) {
            partnerVideo.current.srcObject = null;
          }
          if (partnerAudio.current) {
            partnerAudio.current.srcObject = null;
          }
        }); 
      } catch {}

      if (currentRoomID) {
        zgEngine.current.logoutRoom(currentRoomID).catch((e) => console.error("Zego Logout Error:", e));
      }

      zgEngine.current = null;
    }

    // 3. Media/DOM Cleanup Logic
    try {
      if (partnerVideo.current) { partnerVideo.current.srcObject = null; }
      if (userVideo.current) { userVideo.current.srcObject = null; }
      if (partnerAudio.current) { partnerAudio.current.srcObject = null; }
    } catch (e) { console.warn('DOM cleanup error:', e); }

    endCurrentStream();
    resetCallState();
  }, [socket, remoteStreamList, user._id, caller, currentCallType, localStream, resetCallState, endCurrentStream]);

  // 2. 🛑🛑🛑 setupZegoEngine FUNCTION (Remote Video Bug Fix & Dependency Array ပြင်ဆင်ပြီး) 🛑🛑🛑
  const setupZegoEngine = useCallback(async (roomID) => {
    if (zgEngine.current) return zgEngine.current;

    const zg = new ZegoExpressEngine(ZEGO_APP_ID);
    zgEngine.current = zg;

    zg.on("roomStateUpdate", (rID, state, errorCode) => {
      console.log(`[Zego] Room ${rID} state: ${state}, Code: ${errorCode}`);
      if (state === "DISCONNECTED") { 
        toast.error("Zego connection lost. Call ended.");
        endCall(true);
      }
    });

    zg.on("roomStreamUpdate", async (rID, updateType, streamList) => {
      if (updateType === "ADD") {
        for (const streamInfo of streamList) {
          // 1. Stream ကို စတင်ခေါ်ယူပါ
          const remoteStream = await zg.startPlayingStream(streamInfo.streamID);
          
          // 2. State ထဲသို့ Functional Update ပုံစံဖြင့် ထည့်သွင်းပါ
          setRemoteStreamList((prev) => [...prev, { streamID: streamInfo.streamID, stream: remoteStream }]);

          // 3. Audio Track ကို Partner Audio Element သို့ ချိတ်ဆက်ပါ
          if (partnerAudio.current && remoteStream.getAudioTracks().length > 0) {
            const audioStream = new MediaStream(remoteStream.getAudioTracks());
            partnerAudio.current.srcObject = audioStream;
            partnerAudio.current.autoplay = true;
            partnerAudio.current.play().catch(() => {});
          }

          // 4. Video Track ကို Partner Video Element သို့ ချိတ်ဆက်ပါ (BUG FIX)
          const isRemoteVideoStream = streamInfo.streamID.endsWith("_video");
          if (isRemoteVideoStream && partnerVideo.current && remoteStream.getVideoTracks().length > 0) {
            partnerVideo.current.srcObject = remoteStream;
            partnerVideo.current.playsInline = true;
            
            // 🚨🚨🚨 CALLER ဖက်က RECEIVER ပုံ ပေါ်ဖို့အတွက် play() ကို သေချာခေါ်ပါ။ 🚨🚨🚨
            partnerVideo.current.play().catch(e => console.warn("Remote Video Play Error:", e));
            
            console.log(`[Zego] Remote Video Stream Attached: ${streamInfo.streamID}`);
          }
          console.log(`[Zego] Playing stream: ${streamInfo.streamID}`);
        }
      } else if (updateType === "DELETE") {
        for (const streamInfo of streamList) {
          zg.stopPlayingStream(streamInfo.streamID);
          
          // Functional Update ဖြင့် stream ဖြုတ်ခြင်းနှင့် DOM cleanup
          setRemoteStreamList((prev) => {
            const deletedStreamItem = prev.find(item => item.streamID === streamInfo.streamID);
            if (partnerVideo.current && deletedStreamItem && partnerVideo.current.srcObject === deletedStreamItem.stream) {
              partnerVideo.current.srcObject = null;
            }
            if (partnerAudio.current && deletedStreamItem) {
              partnerAudio.current.srcObject = null;
            }
            return prev.filter((item) => item.streamID !== streamInfo.streamID);
          });
        }
        if (callAccepted) {
          toast.error("Partner disconnected. Call ended.");
          endCall(true);
        }
      }
    });

    return zg;
  }, [callAccepted, endCall]); 

  // global safety... 
  useEffect(() => {
    const handleBeforeUnload = () => { try { endCall(false); } catch {} };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const onSocketDisconnect = () => { endCall(true); };
    socket?.on?.('disconnect', onSocketDisconnect);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      socket?.off?.('disconnect', onSocketDisconnect);
    };
  }, [socket, endCall]);

  // 3. 🛑🛑🛑 acceptCall FUNCTION 🛑🛑🛑
  const acceptCall = useCallback(async (incomingCaller, callType) => {
    console.log(`[WebRTC-Zego] acceptCall for Room: ${incomingCaller.roomID} (${callType})`);

    const { roomID, id: callerID } = incomingCaller;

    resetCallState();
    setCallAccepted(true);
    setCurrentCallType(callType);
    partnerIdRef.current = callerID;

    stopRingIn();
    endCurrentStream();

    try {
      // Pre-prompt media permission
      await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === "video" });
      
      const { data: tokenResponse } = await api.post("/zego/token", { roomID, userID: user._id });
      if (!tokenResponse?.token) throw new Error("Token generation failed.");
      const { token } = tokenResponse;

      const zg = await setupZegoEngine(roomID);

      await zg.loginRoom(roomID, token, { userID: user._id, userName: user.username });
      console.log(`[Zego] Logged into room: ${roomID}`);

      const wantVideo = callType === "video";
      const stream = await zg.createStream({
        camera: {
          audio: true,
          video: wantVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        },
      });
      setLocalStream(stream);

      if (userVideo.current) {
        userVideo.current.srcObject = stream;
        userVideo.current.muted = true;
        userVideo.current.playsInline = true;
        userVideo.current.autoplay = true;

        if (wantVideo && stream.getVideoTracks().length > 0) {
          await userVideo.current.play().catch(e => console.warn("Local Video Play Error:", e));
        } else if (!wantVideo) {
          await userVideo.current.play().catch(e => console.warn("Local Audio Play Error on userVideo:", e));
        }
      }

      const streamID = `${user._id}_${roomID}_${callType}`;
      await zg.startPublishingStream(streamID, stream);
      console.log(`[Zego] Publishing stream: ${streamID}`);

      socket?.emit("answerCall", { to: partnerIdRef.current });
    } catch (err) {
      console.error("Zego Call Accept Error: ", err);
      toast.error("Unable to accept call. Check console for details.");
      endCall();
    }
  }, [user._id, endCurrentStream, resetCallState, setupZegoEngine, socket, endCall]);

  // 4. socket listeners (Rejected Logic ပေါင်းစပ်ထားသည်)
  useEffect(() => {
    if (!socket) return;

    let toastTimer;

    const onIncomingCall = ({ from, name, callType, roomID }) => {
      console.log(`[Socket] Incoming ${callType} call from ${name}`);

      // already in a call or receiving a call, ignore new incoming call
      if (callAccepted || calling || receivingCall) return;

      setReceivingCall(true);
      setCaller({ id: from, name, roomID });
      setCurrentCallType(callType || "audio");

      partnerIdRef.current = from;
      const tempCaller = { id: from, name, roomID };

      if (!incomingToastLockRef.current) {
        incomingToastLockRef.current = true;
        playRingIn();

        incomingToastIdRef.current = toast.custom((t) => (
          <div className="bg-gray-800 text-white p-4 rounded-md shadow-lg">
            <p>📞 Incoming {callType || "audio"} call from {name}</p>
            <button
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md mt-2 mr-2"
              onClick={() => { acceptCall(tempCaller, callType || "audio"); toast.dismiss(t.id); }}
            >
              Accept
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md mt-2"
              onClick={() => { endCall(false, true); toast.dismiss(t.id); }} // isReject=true ပေးပြီး endCall ကို ခေါ်ပါ
            >
              Reject
            </button>
              </div>
        ), { duration: 7000 });

        toastTimer = setTimeout(() => {
          if (incomingToastIdRef.current) toast.dismiss(incomingToastIdRef.current);
          incomingToastIdRef.current = null;
          incomingToastLockRef.current = false;
          if (!callAccepted) {
            // timeout ဖြစ်ရင် reject အဖြစ် သတ်မှတ်ပြီး caller ကို အကြောင်းကြား
            endCall(false, true); 
          }
        }, 7000);
      }
    };

    const onCallAccepted = () => { setCallAccepted(true); stopRingOut(); };
    const onCallEnded = () => { toast.error("Call ended by partner."); endCall(true); };
    
    // Rejected Listener
    const onCallRejected = () => {
      toast.error("Call rejected by partner.");
      endCall(true, true); 
    };

    socket.on("incomingCall", onIncomingCall);
    socket.on("callAccepted", onCallAccepted);
    socket.on("callEnded", onCallEnded);
    socket.on("callRejected", onCallRejected); 

    return () => {
      socket.off("incomingCall", onIncomingCall);
      socket.off("callAccepted", onCallAccepted);
      socket.off("callEnded", onCallEnded);
      socket.off("callRejected", onCallRejected); 
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, [socket, endCall, acceptCall, callAccepted, calling, receivingCall]); // Dependencies ပြန်စစ်ထားသည်။

  // 5. 🛑🛑🛑 startCall FUNCTION 🛑🛑🛑
  const startCall = async (toUserId, callType) => {
    console.log(`[WebRTC-Zego] Initiating call to ${toUserId} (${callType})`);

    resetCallState();

    const roomID = [user._id, toUserId].sort().join("_");
    setCalling(true);
    setCurrentCallType(callType);
    partnerIdRef.current = toUserId;

    endCurrentStream();

    try {
      // Pre-prompt media permission
      await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === "video" });

      // 1) get token
      const { data: tokenResponse } = await api.post("/zego/token", { roomID, userID: user._id });
      if (!tokenResponse?.token) throw new Error("Token generation failed.");
      const { token } = tokenResponse;

      // 2) setup zego
      const zg = await setupZegoEngine(roomID);

      // 3) login room
      await zg.loginRoom(roomID, token, { userID: user._id, userName: user.username });
      console.log(`[Zego] Logged into room: ${roomID}`);

      // 4) create local media and publish
      const wantVideo = callType === "video";
      const stream = await zg.createStream({
        camera: {
          audio: true,
          video: wantVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        },
      });
      setLocalStream(stream);

      if (userVideo.current) {
        userVideo.current.srcObject = stream;
        userVideo.current.muted = true;
        userVideo.current.playsInline = true;
        userVideo.current.autoplay = true;

        await userVideo.current.play().catch(e => console.warn("Local Video Play Error:", e));
      }

      const streamID = `${user._id}_${roomID}_${callType}`;
      await zg.startPublishingStream(streamID, stream);
      console.log(`[Zego] Publishing stream: ${streamID}`);

      playRingOut();
      socket?.emit("callUser", { userToCall: toUserId, roomID, from: user._id, name: user.username, callType });
    } catch (err) {
      console.error("Zego Call Initiation Error: ", err);
      toast.error("Unable to start call. Check console for details.");
      endCall();
    }
  };

  // toggles... 
  const toggleMic = (enable) => { localStream?.getAudioTracks().forEach((t) => (t.enabled = enable)); };
  const toggleCamera = (enable) => { localStream?.getVideoTracks().forEach((t) => (t.enabled = enable)); };

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
    toggleMic,
    toggleCamera,
  };
};

export default useWebRTC;