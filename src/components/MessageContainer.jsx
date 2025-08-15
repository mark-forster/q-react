import React, { useEffect, useState, useRef } from "react";
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
} from "@chakra-ui/react";
import Message from "./Message";
import MessageInput from "./MessageInput";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import {
  selectedConversationAtom,
  conversationsAtom,
} from "../atoms/messageAtom";
import axios from "axios";
import userAtom from "../atoms/userAtom";
import { useSocket } from "../context/SocketContext";
import messageSound from "../assets/sounds/msgSound.mp3";

// Create an axios instance here to use VITE_API_URL consistently.
const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

// Component for the skeleton loading animation
const LoadingMessageSkeleton = ({ isSender }) => (
  <Flex
    gap={2}
    alignItems={"center"}
    p={1}
    borderRadius={"md"}
    alignSelf={isSender ? "flex-end" : "flex-start"}
  >
    {isSender ? <SkeletonCircle size={7} /> : null}
    <Flex flexDir={"column"} gap={2}>
      <Skeleton h="8px" w="250px" />
      <Skeleton h="8px" w="250px" />
      <Skeleton h="8px" w="250px" />
    </Flex>
    {!isSender ? <SkeletonCircle size={7} /> : null}
  </Flex>
);

const MessageContainer = () => {
  const [selectedConversation] = useRecoilState(selectedConversationAtom);
  const [loadingMessage, setLoadingMessage] = useState(true);
  const [messages, setMessages] = useState([]);
  const currentUser = useRecoilValue(userAtom);
  const { socket, onlineUsers } = useSocket();
  const setConversations = useSetRecoilState(conversationsAtom);
  const messageEndRef = useRef(null);

  const isOnline =
    selectedConversation?.userId &&
    onlineUsers.includes(selectedConversation.userId);

  // Fetch messages for the conversation
  useEffect(() => {
    const getMessages = async () => {
      if (!selectedConversation?._id) return;
      setLoadingMessage(true);
      // Clear old messages
      setMessages([]);

      try {
        // Don't make an API call for mock conversations
        if (selectedConversation.mock) {
          setLoadingMessage(false);
          return;
        }

        // Fetch messages
        const response = await api.get(
          `/messages/conversation/${selectedConversation._id}`
        );
        setMessages(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingMessage(false);
      }
    };
    getMessages();
  }, [selectedConversation._id, selectedConversation.mock, setMessages]);

  // Listen for real-time messages from the socket
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (message) => {
      // Only handle messages for the currently selected conversation from other users
      if (
        selectedConversation?._id === message.conversationId &&
        message.sender !== currentUser._id
      ) {
        // Play a message sound
        const sound = new Audio(messageSound);
        sound.play();
        // Add the new message to the list
        setMessages((prev) => [...prev, message]);
      }

      setConversations((prev) => {
        let conversationFound = false;
        const updatedConversations = prev.map((conversation) => {
          if (conversation._id === message.conversationId) {
            conversationFound = true;
            return {
              ...conversation,
              lastMessage: {
                text: message.text,
                sender: message.sender,
                // Update the timestamp
                updatedAt: new Date().toISOString(),
              },
            };
          }
          return conversation;
        });

        if (conversationFound) {
          const updatedConversation = updatedConversations.find(
            (conv) => conv._id === message.conversationId
          );
          const otherConversations = updatedConversations.filter(
            (conv) => conv._id !== message.conversationId
          );
          return [updatedConversation, ...otherConversations];
        }

        return prev;
      });
    };

    const handleMessagesSeen = ({ conversationId }) => {
      if (
        selectedConversation?._id?.toString() === conversationId?.toString()
      ) {
        setMessages((prev) =>
          prev.map((message) => {
            if (!message.seen) {
              return { ...message, seen: true };
            }
            return message;
          })
        );
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messagesSeen", handleMessagesSeen);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesSeen", handleMessagesSeen);
    };
  }, [
    socket,
    selectedConversation,
    setConversations,
    currentUser._id,
    setMessages,
  ]);

  // Scroll to the bottom of the message container whenever a new message arrives
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Flex
      flex="70"
      bg={useColorModeValue("gray.200", "gray.dark")}
      borderRadius={"md"}
      p={2}
      flexDirection={"column"}
      mt={4}
    >
      <Flex w="full" h={14} alignItems="center" gap={3} px={2}>
        {/* Avatar Container */}
        <Box position="relative">
          <Avatar
            src={selectedConversation?.userProfilePic.url}
            size="md"
            name={selectedConversation?.name}
            boxShadow="md"
          >
            {/* Online/Offline Badge */}
            <AvatarBadge
              boxSize="0.8em"
              bg={isOnline ? "green.500" : "orange.500"}
              border="2px solid"
              borderColor={useColorModeValue("white", "gray.800")}
            />
          </Avatar>
        </Box>

        {/* Name & Status */}
        <Flex direction="column" lineHeight="short">
          <Text
            fontWeight="bold"
            fontSize="md"
            color={useColorModeValue("gray.800", "white")}
          >
            {selectedConversation?.name}
          </Text>
          <Text fontSize="12px" mt="5px" color={isOnline ? "green.500" : "orange.400"}>
            {isOnline ? "Online" : "Offline"}
          </Text>
        </Flex>
      </Flex>
      <Divider />

      <Flex
        flexDir={"column"}
        flex={"flexGrow"}
        gap={4}
        my={4}
        p={2}
        height={"80%"}
        overflowY={"auto"}
      >
        {loadingMessage &&
          [...Array(20)].map((_, i) => (
            <LoadingMessageSkeleton key={i} isSender={i % 2 === 0} />
          ))}
        {!loadingMessage && messages.length === 0 && (
          <Flex alignItems="center" justifyContent="center" height="100%">
            <Text color="gray.500">No message, start a conversation</Text>
          </Flex>
        )}
        {!loadingMessage &&
          messages.map((message, index) => (
            <Flex
              key={message._id || index}
              direction={"column"}
              ref={messages.length - 1 === index ? messageEndRef : null}
            >
              <Message
                message={message}
                ownMessage={currentUser._id === message.sender}
              />
            </Flex>
          ))}
      </Flex>
      <MessageInput setMessages={setMessages} />
    </Flex>
  );
};

export default MessageContainer;
