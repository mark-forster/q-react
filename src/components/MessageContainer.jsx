import React, { useEffect, useRef } from "react";
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
  messagesAtom, //
} from "../atoms/messageAtom";
import axios from "axios";
import userAtom from "../atoms/userAtom";
import { useSocket } from "../context/SocketContext";
import messageSound from "../assets/sounds/msgSound.wav";

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
  const [messages, setMessages] = useRecoilState(messagesAtom); 
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
      setMessages([]); // Clear messages to show loading skeleton

      try {
        if (selectedConversation.mock) {
          return;
        }
        const response = await api.get(
          `/messages/conversation/${selectedConversation._id}`
        );
        setMessages(response.data);
      } catch (error) {
        console.error(error);
      }
    };
    getMessages();
  }, [selectedConversation._id, selectedConversation.mock, setMessages]); // Add setMessages to dependencies

  // Realtime listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (
        selectedConversation?._id === message.conversationId &&
        message.sender !== currentUser._id
      ) {
        const sound = new Audio(messageSound);
        sound.play();
        setMessages((prev) => [...prev, message]);
      }
      setConversations((prev) => {
        let found = false;
        const updated = prev.map((c) => {
          if (c._id === message.conversationId) {
            found = true;
            return {
              ...c,
              lastMessage: {
                text: message.text,
                sender: message.sender,
                updatedAt: new Date().toISOString(),
              },
            };
          }
          return c;
        });
        if (found) {
          const top = updated.find((c) => c._id === message.conversationId);
          const rest = updated.filter((c) => c._id !== message.conversationId);
          return [top, ...rest];
        }
        return prev;
      });
    };

    const handleMessagesSeen = ({ conversationId }) => {
      if (selectedConversation?._id?.toString() === conversationId?.toString()) {
        setMessages((prev) =>
          prev.map((m) => (m.seen ? m : { ...m, seen: true }))
        );
      }
    };

    const handleMessageDeleted = ({ conversationId, messageId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
      setConversations((prevConvs) =>
        prevConvs.map((c) => {
          if (c._id !== conversationId) return c;
          const remaining = messages.filter((m) => m._id !== messageId);
          const lastMsg = remaining.length > 0 ? remaining[remaining.length - 1] : null;

          return {
            ...c,
            lastMessage: lastMsg
              ? {
                  text: lastMsg.text || (lastMsg.attachments?.length ? "Attachment" : ""),
                  sender: lastMsg.sender,
                  updatedAt: lastMsg.updatedAt || new Date().toISOString(),
                }
              : {},
          };
        })
      );
    };

    const handleMessageUpdated = ({ conversationId, messageId, newText }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, text: newText } : m))
        );
      }
      setConversations((prevConvs) =>
        prevConvs.map((c) => {
          if (c._id !== conversationId) return c;
          return {
            ...c,
            lastMessage: {
              ...c.lastMessage,
              text: newText,
            },
          };
        })
      );
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messageUpdated", handleMessageUpdated);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messageUpdated", handleMessageUpdated);
    };
  }, [socket, selectedConversation?._id, currentUser._id, setConversations, setMessages, messages]); // Add setMessages to dependencies

  // Auto-scroll to bottom
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
        <Box position="relative">
          <Avatar
            src={
              selectedConversation?.userProfilePic?.url ||
              selectedConversation?.userProfilePic
            }
            size="md"
            name={selectedConversation?.name}
            boxShadow="md"
          >
            <AvatarBadge
              boxSize="0.8em"
              bg={isOnline ? "green.500" : "orange.500"}
              border="2px solid"
              borderColor={useColorModeValue("white", "gray.800")}
            />
          </Avatar>
        </Box>
        <Flex direction="column" lineHeight="short">
          <Text
            fontWeight="bold"
            fontSize="md"
            color={useColorModeValue("gray.800", "white")}
          >
            {selectedConversation?.name}
          </Text>
          <Text
            fontSize="12px"
            mt="5px"
            color={isOnline ? "green.500" : "orange.400"}
          >
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
        {messages.length === 0 && (
          <Flex alignItems="center" justifyContent="center" height="100%">
            <Text color="gray.500">No message, start a conversation</Text>
          </Flex>
        )}
        {messages.map((message, index) => (
          <Flex
            key={message._id || index}
            direction={"column"}
            ref={messages.length - 1 === index ? messageEndRef : null}
          >
            <Message
              message={message}
              ownMessage={currentUser._id === message.sender}
              selectedConversation={selectedConversation}
            />
          </Flex>
        ))}
      </Flex>
      <MessageInput setMessages={setMessages} />
    </Flex>
  );
};

export default MessageContainer;
