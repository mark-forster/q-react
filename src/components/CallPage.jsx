import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import useWebRTC from "../hooks/useWebRTC";
import { Box, Flex, Text, Spinner, Heading, Avatar } from "@chakra-ui/react";

import { useSocket } from "../context/SocketContext";
import outgoingTone from "../assets/sounds/msgSound.wav";

const CallPage = () => {
  const { roomID } = useParams();
  const [params] = useSearchParams();
  const { socket } = useSocket();

  const userID = params.get("user");
  const userName = params.get("name");
  const callType = params.get("type");
  const acceptedFlag = params.get("accepted") === "true"; // receiver side

  const {
    startUIKitCall,
    cleanupZegoCall,
  } = useWebRTC(socket);

  const [hasJoined, setHasJoined] = useState(false);
  const [permissionsOK, setPermissionsOK] = useState(true);
  const [networkQuality, setNetworkQuality] = useState("good");

  const [isMuted, setIsMuted] = useState(false);      // still passed to hook
  const [isVideoOff, setIsVideoOff] = useState(false);

  const timerRef = useRef(null);
  const ringRef = useRef(null);
  const joinCalledRef = useRef(false); // DOUBLE-JOIN blocker

  // ---- ringtone ----
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

  const startTimer = () => {
    timerRef.current = setInterval(() => {}, 1000); // no UI, but keeps pattern
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // ---- join Zego room ----
  const joinRoomNow = () => {
    if (joinCalledRef.current) return;
    joinCalledRef.current = true;

    if (hasJoined) return;

    setHasJoined(true);
    stopRing();

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
    }).finally(() => {
      startTimer();
    });
  };

  const handleInternalEnd = () => {
    cleanupZegoCall();
    stopRing();
    stopTimer();

    if (window.opener) {
      window.opener.postMessage({ type: "call-ended-self" }, "*");
    }

    window.close();
  };

  // ---- window closing (back button, etc.) ----
  useEffect(() => {
    const onUnload = () => handleInternalEnd();
    window.addEventListener("beforeunload", onUnload);

    return () => {
      window.removeEventListener("beforeunload", onUnload);
      stopRing();
      stopTimer();
      cleanupZegoCall();
    };
    // eslint-disable-next-line
  }, []);

  // ---- initial mount (caller vs receiver) ----
  useEffect(() => {
    if (acceptedFlag) {
      // receiver side: already accepted -> join now
      joinRoomNow();
    } else {
      // caller side: just ringing until accepted
      startRing();
    }
    // eslint-disable-next-line
  }, [acceptedFlag]);

  // ---- caller gets accepted via postMessage from parent ----
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === "call-accepted") {
        joinRoomNow();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <Flex w="100vw" h="100vh" bg="gray.900" color="white">
      {/* Zego video area */}
      <Box
        id="zego-call-container"
        w="100%"
        h="100%"
        style={{ display: hasJoined && permissionsOK ? "block" : "none" }}
      />

      {/* Pre-join Calling overlay (Zego မ join ရသေးသော်လည်း အချိန်တိုအနေနဲ့ပဲ) */}
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
          <Text mt={2} color="gray.400">
            Calling…
          </Text>
          <Spinner mt={6} size="xl" />
        </Flex>
      )}

      {/* Permission error overlay */}
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
