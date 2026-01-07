// src/chat/hooks/useIncomingCall.js
import { useEffect, useRef, useState } from "react";
import incomingRingtone from "../assets/sounds/incomeRing.mp3";

export default function useIncomingCall(socket) {
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [isIncomingCallOpen, setIsIncomingCallOpen] = useState(false);

  const ringtoneRef = useRef(null);
  const activeCallWindowRef = useRef(null);
useEffect(() => {
  if (!socket) return;

  const closeIncomingModal = ({ roomID }) => {
    if (!incomingCallData) return;

    if (incomingCallData.roomID !== roomID) return;

    stopRing();
    setIncomingCallData(null);
    setIsIncomingCallOpen(false);
  };

  socket.on("callCanceled", closeIncomingModal);
  socket.on("callRejected", closeIncomingModal);
  socket.on("callEnded", closeIncomingModal);
  socket.on("callTimeout", closeIncomingModal);

  return () => {
    socket.off("callCanceled", closeIncomingModal);
    socket.off("callRejected", closeIncomingModal);
    socket.off("callEnded", closeIncomingModal);
    socket.off("callTimeout", closeIncomingModal);
  };
}, [socket, incomingCallData]);

  // ringtone init
  useEffect(() => {
    ringtoneRef.current = new Audio(incomingRingtone);
    ringtoneRef.current.loop = true;
    return () => ringtoneRef.current?.pause();
  }, []);

  const playRing = () => {
    try {
      ringtoneRef.current?.play();
    } catch {}
  };

  const stopRing = () => {
    try {
      ringtoneRef.current?.pause();
      ringtoneRef.current.currentTime = 0;
    } catch {}
  };

  // 🔥 GLOBAL incoming call listener
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (payload) => {
      // already in call → auto reject
      if (
        activeCallWindowRef.current &&
        !activeCallWindowRef.current.closed
      ) {
        socket.emit("callRejected", { roomID: payload.roomID });
        return;
      }

      setIncomingCallData(payload);
      setIsIncomingCallOpen(true);
      playRing();
    };

    socket.on("incomingCall", handleIncomingCall);
    return () => socket.off("incomingCall", handleIncomingCall);
  }, [socket]);

  const answerCall = ({ currentUser }) => {
    if (!incomingCallData) return;

    stopRing();
    socket.emit("answerCall", { roomID: incomingCallData.roomID });

    const win = window.open(
      `/call/${incomingCallData.roomID}?type=${incomingCallData.callType}&user=${currentUser._id}&name=${currentUser.username}&accepted=true`,
      "_blank",
      "width=800,height=600"
    );

    activeCallWindowRef.current = win;
    setIncomingCallData(null);
    setIsIncomingCallOpen(false);
  };

  const rejectCall = () => {
    if (!incomingCallData) return;

    socket.emit("callRejected", { roomID: incomingCallData.roomID });
    stopRing();
    setIncomingCallData(null);
    setIsIncomingCallOpen(false);
  };

  return {
    incomingCallData,
    isIncomingCallOpen,
    answerCall,
    rejectCall,
  };
}
