import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import useWebRTC from "../hooks/useWebRTC";

import {
  Box,
  Flex,
  Text,
  Spinner,
  Heading,
  Avatar,
  Button,
} from "@chakra-ui/react";

import { useSocket } from "../context/SocketContext";
import outgoingTone from "../assets/sounds/msgSound.wav";

const CallPage = () => {
  const { roomID } = useParams();
  const [params] = useSearchParams();
  const { socket } = useSocket();

  const userID = params.get("user");
  const userName = params.get("name");
  const callType = params.get("type");
  const acceptedFlag = params.get("accepted") === "true";
const rejoinFlag = params.get("rejoin") === "true";

  const {
    startUIKitCall,
    cleanupZegoCall,
  } = useWebRTC(socket);

  const [hasJoined, setHasJoined] = useState(false);
  const [permissionsOK, setPermissionsOK] = useState(true);
  const [networkQuality, setNetworkQuality] = useState("good");

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // ⭐ NEW STATES
  const [callStarted, setCallStarted] = useState(false);
  const [participants, setParticipants] = useState([]);

  const ringRef = useRef(null);
  const joinCalledRef = useRef(false);
  const endedRef = useRef(false);
useEffect(() => {
  if (!socket) return;

  const guardEnd = ({ roomID: rid }) => {
    if (String(rid) !== String(roomID)) return;
    handleInternalEnd();
  };

  socket.on("callCanceled", guardEnd);
  socket.on("callRejected", guardEnd);
  socket.on("callEnded", guardEnd);
  socket.on("callTimeout", guardEnd);
  socket.on("roomEnded", guardEnd);

  return () => {
    socket.off("callCanceled", guardEnd);
    socket.off("callRejected", guardEnd);
    socket.off("callEnded", guardEnd);
    socket.off("callTimeout", guardEnd);
    socket.off("roomEnded", guardEnd);
  };
}, [socket, roomID]);

  /* =========================
     OUTGOING RING
  ========================= */
  const startRing = () => {
    ringRef.current = new Audio(outgoingTone);
    ringRef.current.loop = true;
    ringRef.current.play().catch(() => {});
  };

  const stopRing = () => {
    if (!ringRef.current) return;
    ringRef.current.pause();
    ringRef.current.currentTime = 0;
  };

  /* =========================
     JOIN ZEGO ROOM
  ========================= */
  const joinRoomNow = () => {
    if (joinCalledRef.current || hasJoined) return;
    joinCalledRef.current = true;

    stopRing();
    setHasJoined(true);

    startUIKitCall({
      roomID,
      userID,
      userName,
      callType,
      setNetworkQuality,
      setPermissionsOK,
      toast: null,
      endCallCallback: handleInternalEnd,
      setIsMuted,
      setIsVideoOff,
    });
  };

  /* =========================
     END / CLOSE
  ========================= */
  const handleInternalEnd = () => {
    if (endedRef.current) return;
    endedRef.current = true;

    cleanupZegoCall();
    stopRing();

    if (window.opener) {
      window.opener.postMessage({ type: "call-ended-self" }, "*");
    }

    window.close();
  };

  const handleCancelCall = () => {
    if (!socket) return;

    stopRing();
    socket.emit("cancelCall", { roomID });
    handleInternalEnd();
  };

  /* =========================
     WINDOW CLOSE
  ========================= */
  useEffect(() => {
    const beforeUnload = () => handleInternalEnd();
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      cleanupZegoCall();
      stopRing();
    };
  }, []);

  /* =========================
     INITIAL RING / AUTO JOIN
  ========================= */
 useEffect(() => {
  if (acceptedFlag || rejoinFlag) {
    // ✅ accept OR rejoin → join immediately
    joinRoomNow();
  } else {
    // ❌ only brand-new outgoing call rings
    startRing();
  }
}, [acceptedFlag, rejoinFlag]);


  /* =========================
     MESSAGE FROM PARENT WINDOW
  ========================= */
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === "call-accepted") joinRoomNow();
      if (event.data?.type === "force-end-call") handleInternalEnd();
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  /* =========================
     ⭐ SOCKET CALL EVENTS (IMPORTANT)
  ========================= */
  useEffect(() => {
    if (!socket) return;

    // 🔥 B (or anyone) accepted → A must join + UI change
    const onCallStarted = ({ roomID: rid }) => {
      if (String(rid) !== String(roomID)) return;
      setCallStarted(true);
      joinRoomNow();
    };

    // 👥 Group participant joined (Messenger-style)
    const onParticipantJoined = ({ roomID: rid, userId }) => {
      if (String(rid) !== String(roomID)) return;
      setParticipants((prev) =>
        prev.includes(String(userId)) ? prev : [...prev, String(userId)]
      );
    };
socket.on("callRejoined", ({ roomID: rid }) => {
  if (String(rid) === String(roomID)) {
    joinRoomNow();
  }
});
    socket.on("callStarted", onCallStarted);
    socket.on("groupCallParticipantJoined", onParticipantJoined);

    return () => {
      socket.off("callStarted", onCallStarted);
      socket.off("groupCallParticipantJoined", onParticipantJoined);
        socket.off("callRejoined");

    };
  }, [socket, roomID]);

  /* =========================
     UI
  ========================= */
  return (
    <Flex w="100vw" h="100vh" bg="gray.900" color="white">
      {/* Zego UI */}
      <Box
        id="zego-call-container"
        w="100%"
        h="100%"
        style={{
          display: hasJoined && permissionsOK ? "block" : "none",
        }}
      />

      {/* RINGING / CONNECTING */}
      {!hasJoined && (
        <Flex
          position="absolute"
          inset={0}
          bg="gray.900"
          align="center"
          justify="center"
          direction="column"
          zIndex={20}
        >
          <Avatar size="2xl" name={userName} />
          <Heading mt={4}>{userName}</Heading>

          {(acceptedFlag || callStarted) ? (
            <Text mt={2} color="green.300">
              Connecting…
            </Text>
          ) : (
            <>
              <Text mt={2} color="gray.400">
                Calling…
              </Text>

              <Button
                mt={6}
                bg="red.500"
                _hover={{ bg: "red.600" }}
                onClick={handleCancelCall}
              >
                Cancel Call
              </Button>
            </>
          )}

          <Spinner mt={6} size="xl" />
        </Flex>
      )}

      {/* PERMISSION ERROR */}
      {!permissionsOK && (
        <Flex
          position="absolute"
          inset={0}
          bg="yellow.600"
          align="center"
          justify="center"
          zIndex={40}
        >
          <Text>Camera / Mic Permission Required</Text>
        </Flex>
      )}
    </Flex>
  );
};

export default CallPage;
