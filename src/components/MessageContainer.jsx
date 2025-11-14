import React, { useEffect, useRef, useState } from "react";
import {
  Flex,
  Text,
  Divider,
  Avatar,
  AvatarBadge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  useToast,
  Box,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
} from "@chakra-ui/react";

import {
  selectedConversationAtom,
  messagesAtom,
  conversationsAtom,
} from "../atoms/messageAtom";
import userAtom from "../atoms/userAtom";

import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { useSocket } from "../context/SocketContext";

import axios from "axios";
import {
  FiPhone,
  FiVideo,
  FiMinimize2,
  FiMaximize2,
  FiX,
} from "react-icons/fi";

import { CiMenuKebab } from "react-icons/ci";
import Message from "./Message";
import MessageInput from "./MessageInput";
import useWebRTC from "../hooks/useWebRTC";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

const MessageContainer = () => {
  const [selectedConversation, setSelectedConversation] = useRecoilState(
    selectedConversationAtom
  );
  const [messages, setMessages] = useRecoilState(messagesAtom);
  const currentUser = useRecoilValue(userAtom);
  const { socket, onlineUsers } = useSocket();
  const setConversations = useSetRecoilState(conversationsAtom);

  const toast = useToast();
  const messageEndRef = useRef(null);
  const [loadingMessages, setLoadingMessages] = useState(true);

  // CALL UI STATES
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [currentCallType, setCurrentCallType] = useState("audio");
  const [isRingingModalOpen, setIsRingingModalOpen] = useState(false);
  const [isIncomingCallModalOpen, setIsIncomingCallModalOpen] =
    useState(false);

  const [incomingCallData, setIncomingCallData] = useState(null);
  const [currentRoomID, setCurrentRoomID] = useState(null);
  const [isCallMaximized, setIsCallMaximized] = useState(false);

  const { startUIKitCall, cleanupZegoCall, leaveZegoCall } = useWebRTC();

  const isOnline =
    selectedConversation?.userId &&
    onlineUsers.includes(selectedConversation.userId);

  /* Load messages */
  useEffect(() => {
    const getMessages = async () => {
      if (!selectedConversation?._id) return;

      setMessages([]);
      setLoadingMessages(true);

      try {
        const res = await api.get(
          `/messages/conversation/${selectedConversation._id}`
        );
        setMessages(res.data);
      } catch {
      } finally {
        setLoadingMessages(false);
      }
    };

    getMessages();
  }, [selectedConversation?._id]);

  /* Auto scroll */
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* END CALL */
  const handleEndCallLogic = (selfEnded = true) => {
    setIsCallMaximized(false);

    if (selfEnded) leaveZegoCall();
    else cleanupZegoCall();

    setIsCallModalOpen(false);
    setIsIncomingCallModalOpen(false);
    setIsRingingModalOpen(false);

    const receiver =
      selectedConversation?.userId || incomingCallData?.from;

    if (selfEnded && receiver) {
      socket.emit("endCall", { to: receiver });
    }

    setIncomingCallData(null);
    setCurrentRoomID(null);
  };

  /* SOCKET EVENTS */
  useEffect(() => {
    if (!socket) return;

    socket.on("incomingCall", ({ from, name, callType, roomID }) => {
      setIncomingCallData({ from, name, callType, roomID });
      setIsIncomingCallModalOpen(true);
    });

    socket.on("callEnded", () => {
      handleEndCallLogic(false);
    });

    socket.on("callRejected", () => {
      setIsCallModalOpen(false);
      setIsRingingModalOpen(false);
      cleanupZegoCall();
    });

    return () => {
      socket.off("incomingCall");
      socket.off("callEnded");
      socket.off("callRejected");
    };
  }, [socket]);

  /* ACCEPT CALL */
  const handleAnswerIncomingCall = () => {
    const data = incomingCallData;
    if (!data) return;

    setIsIncomingCallModalOpen(false);
    setCurrentCallType(data.callType);
    setIsCallModalOpen(true);

    socket.emit("answerCall", { to: data.from });

    setTimeout(() => {
      startUIKitCall({
        roomID: data.roomID,
        userID: currentUser._id,
        userName: currentUser.username,
        callType: data.callType,
        endCallCallback: () => handleEndCallLogic(true),
      });
    }, 250);
  };

  /* REJECT CALL */
  const handleRejectIncomingCall = () => {
    if (!incomingCallData) return;

    socket.emit("callRejected", { to: incomingCallData.from });
    setIsIncomingCallModalOpen(false);
    cleanupZegoCall();
    setIncomingCallData(null);
  };

  /* START OUTGOING CALL */
  const handleStartCall = (type) => {
    if (!selectedConversation?.userId) return;

    setCurrentCallType(type);
    setIsRingingModalOpen(true);

    const roomID = [currentUser._id, selectedConversation.userId]
      .sort()
      .join("_");

    setCurrentRoomID(roomID);

    socket.emit("callUser", {
      userToCall: selectedConversation.userId,
      from: currentUser._id,
      name: currentUser.username,
      roomID,
      callType: type,
    });

    socket.once("callAccepted", () => {
      setIsRingingModalOpen(false);
      setIsCallModalOpen(true);

      startUIKitCall({
        roomID,
        userID: currentUser._id,
        userName: currentUser.username,
        callType: type,
        endCallCallback: () => handleEndCallLogic(true),
      });
    });
  };

  const containerBg = useColorModeValue("white", "gray.800");

  const callPartnerName = incomingCallData
    ? incomingCallData.name
    : selectedConversation?.username;

  const callPartnerPic =
    selectedConversation?.userProfilePic?.url || "/no-pic.jpeg";

  /* UI RENDER */
  return (
    <Flex flex={70} bg={containerBg} p={4} flexDir="column">
      {/* HEADER */}
      <Flex w="100%" h={12} align="center" gap={2}>
        <Avatar src={callPartnerPic} w={9} h={9}>
          {isOnline && <AvatarBadge boxSize="1em" bg="green.500" />}
        </Avatar>

        <Flex flexDir="column">
          <Text fontWeight="bold">{selectedConversation?.username}</Text>
          <Text fontSize="xs" color="gray.500">
            {isOnline ? "Online" : "Offline"}
          </Text>
        </Flex>

        <Flex ml="auto" gap={2}>
          {isOnline && (
            <>
              <Tooltip label="Audio Call">
                <IconButton
                  icon={<FiPhone />}
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStartCall("audio")}
                />
              </Tooltip>

              <Tooltip label="Video Call">
                <IconButton
                  icon={<FiVideo />}
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStartCall("video")}
                />
              </Tooltip>
            </>
          )}

          <Menu>
            <MenuButton
              as={IconButton}
              size="sm"
              icon={<CiMenuKebab />}
              variant="ghost"
            />
            <MenuList>
              <MenuItem>View Profile</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>

      <Divider my={2} />

      {/* MESSAGES */}
      <Flex
        flexGrow={1}
        flexDir="column"
        overflowY="auto"
        p={4}
        gap={4}
      >
        {loadingMessages ? (
          <Text textAlign="center" color="gray.500">
            Loading...
          </Text>
        ) : (
          messages.map((m) => (
            <Message
              key={m._id}
              message={m}
              ownMessage={m.sender === currentUser._id}
            />
          ))
        )}

        <div ref={messageEndRef} />
      </Flex>

      {/* INPUT */}
      <MessageInput setMessages={setMessages} />

      {/* ACTIVE CALL MODAL */}
      {isCallModalOpen && (
        <Modal isOpen isCentered size="xl" closeOnOverlayClick={false}>
          <ModalOverlay />
          <ModalContent bg="gray.900" color="white" p={0}>
            <ModalHeader bg="gray.800" p={2}>
              <Flex justify="space-between" align="center">
                <Flex align="center">
                  <Avatar size="xs" src={callPartnerPic} mr={2} />
                  {currentCallType.toUpperCase()} call with{" "}
                  <b>{callPartnerName}</b>
                </Flex>

                <Flex gap={1}>
                  <IconButton
                    size="xs"
                    variant="ghost"
                    bg="red.500"
                    _hover={{ bg: "red.600" }}
                    icon={<FiX />}
                    onClick={() => handleEndCallLogic(true)}
                  />
                </Flex>
              </Flex>
            </ModalHeader>

            <ModalBody p={0}>
              <Box id="zego-call-container" w="100%" h="400px" />
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      {/* OUTGOING CALL */}
      {isRingingModalOpen && (
        <Modal isOpen isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              Calling {selectedConversation?.username}...
            </ModalHeader>
            <ModalBody textAlign="center">
              <Spinner size="lg" />
            </ModalBody>
            <ModalFooter>
              <Button
                colorScheme="red"
                onClick={() => handleEndCallLogic(true)}
              >
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* INCOMING CALL */}
      {incomingCallData && (
        <Modal isOpen={isIncomingCallModalOpen} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              {incomingCallData.callType.toUpperCase()} Call
            </ModalHeader>
            <ModalBody>
              <Text>
                <b>{incomingCallData.name}</b> is calling you…
              </Text>
            </ModalBody>

            <ModalFooter gap={3}>
              <Button colorScheme="red" onClick={handleRejectIncomingCall}>
                Reject
              </Button>

              <Button
                colorScheme="green"
                onClick={handleAnswerIncomingCall}
              >
                Answer
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Flex>
  );
};

export default MessageContainer;
