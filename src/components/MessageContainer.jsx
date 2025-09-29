// components/MessageContainer.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Flex,
  Text,
  Divider,
  Avatar,
  useColorModeValue,
  SkeletonCircle,
  Skeleton,
  Box,
  AvatarBadge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Tooltip,
} from "@chakra-ui/react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import {
  selectedConversationAtom,
  conversationsAtom,
  messagesAtom,
} from "../atoms/messageAtom";
import axios from "axios";
import userAtom from "../atoms/userAtom";
import { useSocket } from "../context/SocketContext";
import Message from "./Message";
import MessageInput from "./MessageInput";

import { FiPhone, FiVideo } from "react-icons/fi";
import { CiMenuKebab } from "react-icons/ci";
import { useDisclosure } from '@chakra-ui/react';
import useWebRTC from "../hooks/useWebRTC";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

const LoadingMessageSkeleton = ({ isSender }) => (
  <Flex
    gap={2}
    alignItems={"center"}
    p={1}
    borderRadius={"md"}
    alignSelf={isSender ? "flex-end" : "flex-start"}
  >
    {isSender ? null : <SkeletonCircle size={7} />}
    <Flex flexDir={"column"} gap={2}>
      <Skeleton h="8px" w="250px" />
      <Skeleton h="8px" w="250px" />
      <Skeleton h="8px" w="250px" />
    </Flex>
    {isSender ? <SkeletonCircle size={7} /> : null}
  </Flex>
);

const MessageContainer = () => {
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const [messages, setMessages] = useRecoilState(messagesAtom);
  const currentUser = useRecoilValue(userAtom);
  const { socket, onlineUsers } = useSocket();
  const setConversations = useSetRecoilState(conversationsAtom);
  const messageEndRef = useRef(null);
  const toast = useToast();
  const [loadingMessages, setLoadingMessages] = useState(true);

  const isOnline =
    selectedConversation?.userId &&
    onlineUsers.includes(selectedConversation.userId);

  const {
    isCalling,
    isCallAccepted,
    startCall,
    endCall,
    userVideo,
    partnerVideo,
    caller,
    isReceivingCall,
    acceptCall,
    currentCallType,
  } = useWebRTC();

  // kept, but we no longer trigger it from socket; we rely on hook states to open modal
  const {
    isOpen: isCallModalOpen,
    onOpen: onCallModalOpen,
    onClose: onCallModalClose
  } = useDisclosure();

  useEffect(() => {
    const getMessages = async () => {
      if (!selectedConversation?._id) return;
      setMessages([]);
      setLoadingMessages(true);

      try {
        if (selectedConversation.mock) {
          setLoadingMessages(false);
          return;
        }
        const response = await api.get(
          `/messages/conversation/${selectedConversation._id}`
        );
        setMessages(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingMessages(false);
      }
    };
    getMessages();
  }, [selectedConversation._id, selectedConversation.mock, setMessages]);

  useEffect(() => {
    if (!socket) return;

    const handleMessagesSeen = ({ conversationId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender === currentUser._id
              ? { ...m, seenBy: Array.from(new Set([...(m.seenBy || []), selectedConversation.userId])) }
              : m
          )
        );
      }
    };

    const handleReceiveNewMessage = (message) => {
      if (selectedConversation?._id === message.conversationId && message.sender !== currentUser._id) {
        api.put(`/messages/seen/${selectedConversation._id}`)
          .then(() => {
            console.log("Messages seen status updated in real-time.");
          })
          .catch((err) => {
            console.error("Failed to update seen status:", err);
          });
      }
    };

    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("newMessage", handleReceiveNewMessage);

    // ⚠️ Do NOT listen incomingCall here anymore (centralized in useWebRTC)

    return () => {
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("newMessage", handleReceiveNewMessage);
    };
  }, [socket, selectedConversation, setMessages, currentUser._id, setConversations]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loadingMessages]);

  const containerBg = useColorModeValue("white", "gray.800");

  const handleCallStart = (callType) => {
    console.log(`[UI] Call button clicked for call type: ${callType}`);
    if (!selectedConversation?.userId) {
      console.log("[UI] No user ID to call.");
      return;
    }
    startCall(selectedConversation.userId, callType);
    // No manual modal open here; modal visibility is driven by hook state
  };

  const handleEndCall = () => {
    endCall();
    onCallModalClose();
  };

  return (
    <Flex
      flex={70}
      bg={containerBg}
      borderRadius={"md"}
      p={4}
      flexDir={"column"}
    >
      {/* Header */}
      <Flex w={"full"} h={12} alignItems={"center"} gap={2}>
        <Avatar
          src={selectedConversation?.userProfilePic?.url || "/no-pic.jpeg"}
          w={9}
          h={9}
        >
          {isOnline && <AvatarBadge boxSize="1em" bg="green.500" />}
        </Avatar>
        <Flex flexDir="column" ml={1}>
          <Text display={"flex"} alignItems={"center"} fontWeight={"bold"}>
            {selectedConversation?.username}
          </Text>
          <Text fontSize={"xs"} color={"gray.500"}>
            {isOnline ? "Online" : "Offline"}
          </Text>
        </Flex>

        <Flex ml={"auto"} gap={2} alignItems={"center"}>
          {/* Call Buttons */}
          {isOnline && (
            <>
              <Tooltip label="Audio Call" hasArrow placement="bottom">
                <IconButton
                  icon={<FiPhone />}
                  aria-label="Audio Call"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCallStart("audio")}
                />
              </Tooltip>
              <Tooltip label="Video Call" hasArrow placement="bottom">
                <IconButton
                  icon={<FiVideo />}
                  aria-label="Video Call"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCallStart("video")}
                />
              </Tooltip>
            </>
          )}
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<CiMenuKebab />}
              aria-label="Options"
              variant="ghost"
              size="sm"
            />
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

      {/* Message List */}
      <Flex
        flexGrow={1}
        flexDir={"column"}
        gap={4}
        overflowY={"auto"}
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
          <>
            <LoadingMessageSkeleton isSender={false} />
            <LoadingMessageSkeleton isSender={true} />
            <LoadingMessageSkeleton isSender={false} />
          </>
        ) : (
          messages.map((message) => (
            <Flex key={message._id} direction={"column"}>
              <Message message={message} ownMessage={message.sender === currentUser._id} />
            </Flex>
          ))
        )}
        <div ref={messageEndRef} />
      </Flex>

      {/* Input Field */}
      <MessageInput setMessages={setMessages} />

      {/* Call Modal (Design unchanged; visibility driven by hook state) */}
      <Modal
        isOpen={isReceivingCall || isCallAccepted || isCalling}
        onClose={handleEndCall}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {isReceivingCall ? `Incoming Call from ${caller.name}` : (isCallAccepted ? "In Call" : "Calling...")}
          </ModalHeader>
          <ModalBody>
            <Box position="relative">
              {/* Video calls show videos; audio shows avatar text */}
              {currentCallType === 'video' ? (
                <>
                  <video playsInline muted ref={userVideo} autoPlay style={{ width: "100%" }} />
                  {isCallAccepted && (
                    <video playsInline ref={partnerVideo} autoPlay style={{ width: "100%", marginTop: "10px" }} />
                  )}
                </>
              ) : (
                <Box textAlign="center" py={10}>
                  <Avatar size="xl" name={caller?.name || "User"} />
                  <Text fontSize="lg" mt={4}>On a voice call...</Text>
                </Box>
              )}
            </Box>
          </ModalBody>
          <ModalFooter>
            {isReceivingCall && !isCallAccepted && (
              <Button onClick={() => { acceptCall(currentCallType); }} colorScheme="green" mr={3}>
                Accept
              </Button>
            )}
            <Button onClick={handleEndCall} colorScheme="red">
              {isReceivingCall && !isCallAccepted ? "Reject" : "End Call"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export default MessageContainer;
