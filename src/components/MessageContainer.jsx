import React, { useEffect, useRef, useState } from "react";
import {
  Flex, Text, Divider, Avatar, AvatarBadge, IconButton,
  Menu, MenuButton, MenuList, MenuItem,
  useColorModeValue, useToast, Box, Tooltip,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Spinner
} from "@chakra-ui/react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { selectedConversationAtom, messagesAtom, conversationsAtom } from "../atoms/messageAtom";
import userAtom from "../atoms/userAtom";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { FiPhone, FiVideo } from "react-icons/fi";
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
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const [messages, setMessages] = useRecoilState(messagesAtom);
  const currentUser = useRecoilValue(userAtom);
  const { socket, onlineUsers } = useSocket();
  const setConversations = useSetRecoilState(conversationsAtom);
  const toast = useToast();
  const messageEndRef = useRef(null);
  const [loadingMessages, setLoadingMessages] = useState(true);

  // Call UI States
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [currentCallType, setCurrentCallType] = useState("audio");
  const [isRingingModalOpen, setIsRingingModalOpen] = useState(false);
  const [currentRoomID, setCurrentRoomID] = useState(null);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [isIncomingCallModalOpen, setIsIncomingCallModalOpen] = useState(false);
  const [isSelfEndingCall, setIsSelfEndingCall] = useState(false);

  const { startUIKitCall } = useWebRTC();

  const isOnline =
    selectedConversation?.userId && onlineUsers.includes(selectedConversation.userId);

  // Fetch messages
  useEffect(() => {
    const getMessages = async () => {
      if (!selectedConversation?._id) return;
      setMessages([]);
      setLoadingMessages(true);
      try {
        const response = await api.get(`/messages/conversation/${selectedConversation._id}`);
        setMessages(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMessages(false);
      }
    };
    getMessages();
  }, [selectedConversation?._id]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // End call logic - FIX: Removed 500ms delay for Modal Close
  const handleEndCallLogic = (isSelfEnd = true) => {
    setIsRingingModalOpen(false);
    setIsIncomingCallModalOpen(false);
    setIsCallModalOpen(false); // MODIFIED: Close modal immediately

    if (isSelfEnd) {
      setIsSelfEndingCall(true);
      const recipientId = selectedConversation?.userId || incomingCallData?.from;
      if (recipientId) {
        socket.emit("endCall", { to: recipientId });
      }
    }

    setTimeout(() => setIsSelfEndingCall(false), 50);
    setCurrentRoomID(null);
    setIncomingCallData(null);
  };

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("incomingCall", ({ from, name, callType, roomID }) => {
      setIncomingCallData({ from, name, callType, roomID });
      setIsIncomingCallModalOpen(true);
    });

    socket.on("callEnded", () => {
      if (!isSelfEndingCall) {
        handleEndCallLogic(false);
        toast({
          title: "Call Ended",
          description: "The call has ended.",
          status: "info",
          duration: 1500,
          isClosable: true,
        });
      }
    });

    socket.on("callRejected", () => {
      if (isRingingModalOpen) {
        toast({
          title: "Call Rejected",
          description: `${selectedConversation?.username} rejected your call.`,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
      setIsRingingModalOpen(false);
      setIsCallModalOpen(false);
    });

    return () => {
      socket.off("incomingCall");
      socket.off("callEnded");
      socket.off("callRejected");
    };
  }, [socket, toast, selectedConversation, isRingingModalOpen, isSelfEndingCall]);

  // Handle incoming call
  const handleAnswerIncomingCall = () => {
    if (!incomingCallData) return;
    setIsIncomingCallModalOpen(false);
    setCurrentCallType(incomingCallData.callType);
    setIsCallModalOpen(true);
    socket.emit("answerCall", { to: incomingCallData.from });

    setTimeout(() => {
      startUIKitCall({
        roomID: incomingCallData.roomID,
        userID: currentUser._id,
        userName: currentUser.username,
        callType: incomingCallData.callType,
        endCallCallback: () => handleEndCallLogic(true),
      });
    }, 300);
    setIncomingCallData(null);
  };

  const handleRejectIncomingCall = () => {
    if (!incomingCallData) return;
    socket.emit("callRejected", { to: incomingCallData.from });
    setIsIncomingCallModalOpen(false);
    setIncomingCallData(null);
  };

  // Start outgoing call
  const handleStartCall = (type) => {
    if (!selectedConversation?.userId) return;
    setCurrentCallType(type);
    setIsRingingModalOpen(true);

    const roomID = [currentUser._id, selectedConversation.userId].sort().join("_");
    setCurrentRoomID(roomID);

    socket.emit("callUser", {
      userToCall: selectedConversation.userId,
      roomID,
      from: currentUser._id,
      name: currentUser.username,
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

  return (
    <Flex flex={70} bg={containerBg} borderRadius="md" p={4} flexDir="column">
      {/* Header */}
      <Flex w="full" h={12} alignItems="center" gap={2}>
        <Avatar src={selectedConversation?.userProfilePic?.url || "/no-pic.jpeg"} w={9} h={9}>
          {isOnline && <AvatarBadge boxSize="1em" bg="green.500" />}
        </Avatar>
        <Flex flexDir="column" ml={1}>
          <Text fontWeight="bold">{selectedConversation?.username}</Text>
          <Text fontSize="xs" color="gray.500">
            {isOnline ? "Online" : "Offline"}
          </Text>
        </Flex>
        <Flex ml="auto" gap={2}>
          {isOnline && (
            <>
              <Tooltip label="Audio Call" hasArrow placement="bottom">
                <IconButton
                  icon={<FiPhone />}
                  aria-label="Audio Call"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartCall("audio")}
                />
              </Tooltip>
              <Tooltip label="Video Call" hasArrow placement="bottom">
                <IconButton
                  icon={<FiVideo />}
                  aria-label="Video Call"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartCall("video")}
                />
              </Tooltip>
            </>
          )}
          <Menu>
            <MenuButton as={IconButton} icon={<CiMenuKebab />} variant="ghost" size="sm" />
            <MenuList>
              <MenuItem
                onClick={() =>
                  toast({
                    title: "Not implemented yet",
                    description: "This feature is not yet available.",
                    status: "info",
                    duration: 3000,
                    isClosable: true,
                  })
                }
              >
                View Profile
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>

      <Divider my={2} />

      {/* Messages */}
      <Flex
        flexGrow={1}
        flexDir="column"
        gap={4}
        overflowY="auto"
        p={4}
        css={{
          "&::-webkit-scrollbar": { width: "8px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: useColorModeValue("gray.300", "gray.600"),
            borderRadius: "4px",
          },
        }}
      >
        {loadingMessages ? (
          <Text textAlign="center" color="gray.500">
            Loading messages...
          </Text>
        ) : (
          messages.map((m) => (
            <Flex key={m._id} direction="column">
              <Message message={m} ownMessage={m.sender === currentUser._id} />
            </Flex>
          ))
        )}
        <div ref={messageEndRef} />
      </Flex>

      <MessageInput setMessages={setMessages} />

      {/* Active Call Modal */}
      <Modal
        isOpen={isCallModalOpen}
        onClose={() => handleEndCallLogic(true)}
        size={currentCallType === "video" ? "3xl" : "md"}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Text>{`In ${currentCallType} call with ${selectedConversation?.username}`}</Text>
          </ModalHeader>
          <ModalBody>
            <Box
              id="zego-call-container"
              w="full"
              h={currentCallType === "video" ? "450px" : "300px"}
              bg="gray.900"
              borderRadius="md"
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Outgoing Ringing Modal */}
      {isRingingModalOpen && (
        <Modal
          isOpen={isRingingModalOpen}
          onClose={() => handleEndCallLogic(true)}
          isCentered
          closeOnOverlayClick={false}
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <Text fontWeight="bold" color="blue.400">
                Outgoing {currentCallType === "video" ? "Video" : "Audio"} Call
              </Text>
            </ModalHeader>
            <ModalBody textAlign="center">
              <Avatar
                src={selectedConversation?.userProfilePic?.url || "/no-pic.jpeg"}
                size="xl"
                name={selectedConversation?.username}
              />
              <Text mt={3} fontSize="lg">
                Calling{" "}
                <Text as="span" fontWeight="bold">
                  {selectedConversation?.username}
                </Text>
                ...
              </Text>
              <Flex mt={2} justifyContent="center" alignItems="center">
                <Spinner size="sm" mr={2} />
                <Text fontSize="sm" color="gray.500">
                  (Waiting for answer)
                </Text>
              </Flex>
            </ModalBody>
            <ModalFooter justifyContent="center">
              <Button colorScheme="red" onClick={() => handleEndCallLogic(true)}>
                Cancel Call
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Incoming Call Modal */}
      {incomingCallData && (
        <Modal
          isOpen={isIncomingCallModalOpen}
          onClose={handleRejectIncomingCall}
          isCentered
          closeOnOverlayClick={false}
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <Text fontWeight="bold" color="green.500">
                Incoming {incomingCallData.callType === "video" ? "Video" : "Audio"} Call
              </Text>
            </ModalHeader>
            <ModalBody>
              <Text>
                <Text as="span" fontWeight="bold">
                  {incomingCallData.name}
                </Text>{" "}
                is calling you.
              </Text>
            </ModalBody>
            <ModalFooter gap={4}>
              <Button colorScheme="red" onClick={handleRejectIncomingCall}>
                Reject
              </Button>
              <Button colorScheme="green" onClick={handleAnswerIncomingCall}>
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