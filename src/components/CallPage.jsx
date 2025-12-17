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

  const {
    startUIKitCall,
    cleanupZegoCall,
  } = useWebRTC(socket);

  const [hasJoined, setHasJoined] = useState(false);
  const [permissionsOK, setPermissionsOK] = useState(true);
  const [networkQuality, setNetworkQuality] = useState("good");

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const ringRef = useRef(null);
  const joinCalledRef = useRef(false);
  const endedRef = useRef(false);

  // ====== PLAY OUTGOING RING ======
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

  // ====== JOIN ROOM ======
  const joinRoomNow = () => {
    if (joinCalledRef.current) return;
    joinCalledRef.current = true;

    if (hasJoined) return;

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

  // ====== HANDLE END / CLOSE ======
  const handleInternalEnd = () => {
    if (endedRef.current) return;
    endedRef.current = true;

    cleanupZegoCall();
    stopRing();

    // notify parent window
    if (window.opener) {
      window.opener.postMessage({ type: "call-ended-self" }, "*");
    }

    window.close();
  };

  const handleCancelCall = () => {
    if (!socket) return;

    stopRing();

    // notify backend
    socket.emit("cancelCall", {
      to: params.get("receiver"),
      roomID,
    });

    handleInternalEnd();
  };

  // ====== WINDOW CLOSE EVENT ======
  useEffect(() => {
    const beforeUnload = () => handleInternalEnd();
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      cleanupZegoCall();
      stopRing();
    };
  }, []);

  // ====== RINGING OR JOIN ======
  useEffect(() => {
    if (acceptedFlag) {
      joinRoomNow();
    } else {
      startRing();
    }
  }, [acceptedFlag]);

  // ====== MESSAGE FROM PARENT: CALL ACCEPTED ======
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === "call-accepted") joinRoomNow();
      if (event.data?.type === "force-end-call") handleInternalEnd();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <Flex w="100vw" h="100vh" bg="gray.900" color="white">
      {/* Zego call UI container */}
      <Box
        id="zego-call-container"
        w="100%"
        h="100%"
        style={{
          display: hasJoined && permissionsOK ? "block" : "none",
        }}
      />

      {/* BEFORE JOINING (RINGING) */}
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

          {acceptedFlag ? (
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
