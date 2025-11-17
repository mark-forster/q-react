// src/pages/CallPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import useWebRTC from "../hooks/useWebRTC";
import {
  Box,
  Flex,
  Text,
  Spinner,
  Heading,
  Avatar,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import {
  FiX,
  FiWifi,
  FiWifiOff,
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
} from "react-icons/fi";
import { useSocket } from "../context/SocketContext";

const CallPage = () => {
  const { roomID } = useParams();
  const [searchParams] = useSearchParams();
  const { socket } = useSocket();

  const [networkQuality, setNetworkQuality] = useState("good");
  const [permissionsOK, setPermissionsOK] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const userID = searchParams.get("user");
  const userName = searchParams.get("name");
  const callType = searchParams.get("type");

  const {
    startUIKitCall,
    cleanupZegoCall,
    toggleAudio,
    toggleVideo,
    zegoInstanceRef,
  } = useWebRTC(socket);

  const endCallLocal = () => {
    // notify parent
    if (window.opener) {
      window.opener.postMessage({ type: "call-ended-self" }, "*");
    }

    cleanupZegoCall();
    window.close();
  };

  // Self end call (RED button)
  const handleEndCall = () => {
    const receiver = roomID.split("_").find((id) => id !== userID);
    if (socket && receiver) {
      socket.emit("endCall", { to: receiver, roomID });
    }
    endCallLocal();
  };

  // Zego internal callbacks
  const zegoEndCallCallback = () => {
    if (window.opener) {
      window.opener.postMessage({ type: "call-ended-self" }, "*");
    }
    cleanupZegoCall();
    window.close();
  };

  // Peer ended
  useEffect(() => {
    if (!socket) return;

    const handlePeerEnd = () => {
      if (window.opener)
        window.opener.postMessage({ type: "call-ended-by-peer" }, "*");

      cleanupZegoCall();
      window.close();
    };

    socket.on("callEnded", handlePeerEnd);
    return () => socket.off("callEnded", handlePeerEnd);
  }, [socket]);

  // Init call
  useEffect(() => {
    const t = setTimeout(() => {
      startUIKitCall({
        roomID,
        userID,
        userName,
        callType,
        setNetworkQuality,
        setPermissionsOK,
        toast: null,
        endCallCallback: zegoEndCallCallback,
        setIsMuted,
        setIsVideoOff,
      }).finally(() => setLoading(false));
    }, 200);

    const beforeUnload = () => handleEndCall();
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeunload", beforeUnload);
      cleanupZegoCall();
    };
  }, []);

  return (
    <Flex direction="column" height="100vh" width="100vw" bg="gray.900" color="white">
      <Box
        id="zego-call-container"
        flex={1}
        width="100%"
        height="100%"
        style={{
          display: permissionsOK && !loading ? "block" : "none",
          position: "relative",
        }}
      />

      {/* Overlay */}
      <Flex position="absolute" inset={0} direction="column" justify="space-between" align="center" p={8}>
        {/* NETWORK */}
        <Flex justify="flex-end" w="100%">
          <Flex align="center" gap={1} bg="rgba(0,0,0,0.5)" px={2} py={1} borderRadius="md">
            <Text fontSize="sm">
              {networkQuality === "poor"
                ? "Poor"
                : networkQuality === "medium"
                ? "Medium"
                : "Good"}
            </Text>
            {networkQuality === "poor" ? <FiWifiOff color="red" /> : <FiWifi color="green" />}
          </Flex>
        </Flex>

        {/* LOADING / AUDIO UI */}
        {(loading || callType === "audio") && (
          <Flex flexGrow={1} align="center" justify="center" direction="column">
            <Avatar size="2xl" name={userName} mb={4} />
            <Heading size="lg">{userName}</Heading>
            <Text color="gray.400">{loading ? "Connecting..." : "In Call"}</Text>
          </Flex>
        )}

        {/* Controls */}
        <Flex gap={6} mb={6} bg="rgba(0,0,0,0.5)" p={4} borderRadius="full">
          <Tooltip label={isMuted ? "Unmute" : "Mute"}>
            <IconButton
              icon={isMuted ? <FiMicOff /> : <FiMic />}
              size="lg"
              isRound
              colorScheme={isMuted ? "red" : "gray"}
              onClick={() => {
                const next = !isMuted;
                setIsMuted(next);
                toggleAudio(next);
              }}
            />
          </Tooltip>

          {callType === "video" && (
            <Tooltip label={isVideoOff ? "Turn Video On" : "Turn Video Off"}>
              <IconButton
                icon={isVideoOff ? <FiVideoOff /> : <FiVideo />}
                size="lg"
                isRound
                colorScheme={isVideoOff ? "red" : "gray"}
                onClick={() => {
                  const next = !isVideoOff;
                  setIsVideoOff(next);
                  toggleVideo(next);
                }}
              />
            </Tooltip>
          )}

          <IconButton icon={<FiX />} size="lg" isRound colorScheme="red" onClick={handleEndCall} />
        </Flex>
      </Flex>

      {!permissionsOK && (
        <Flex position="absolute" inset={0} justify="center" align="center" bg="yellow.600">
          <Text fontSize="xl">Camera/Mic Permission Required</Text>
        </Flex>
      )}

      {loading && (
        <Flex position="absolute" inset={0} justify="center" align="center" bg="gray.900">
          <Spinner size="xl" />
        </Flex>
      )}
    </Flex>
  );
};

export default CallPage;
