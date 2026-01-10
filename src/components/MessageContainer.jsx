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
  Tooltip,
  Button,
} from "@chakra-ui/react";

import {
  selectedConversationAtom,
  messagesAtom,
  conversationsAtom,
  editingMessageAtom,
} from "../atoms/messageAtom";

import userAtom from "../atoms/userAtom";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";

import { useSocket } from "../context/SocketContext";
import axios from "axios";

import { FiPhone, FiVideo } from "react-icons/fi";
import { CiMenuKebab } from "react-icons/ci";

import Message from "./Message";
import MessageInput from "./MessageInput";
import { getInitials, getAvatarColor } from "../utils/avatarHelpers";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

const MessageContainer = () => {
  const [selectedConversation] = useRecoilState(selectedConversationAtom);
  const [messages, setMessages] = useRecoilState(messagesAtom);
  const [conversations, setConversations] = useRecoilState(conversationsAtom);

  const setEditingMessage = useSetRecoilState(editingMessageAtom);
  const currentUser = useRecoilValue(userAtom);
  const { socket, onlineUsers } = useSocket();

  const containerBg = useColorModeValue("white", "gray.800");
  const profilePic =
    selectedConversation?.userProfilePic?.url ||
    selectedConversation?.userProfilePic ||
    "";
  const messageEndRef = useRef(null);
  const seenRequestRef = useRef({});

  const [loadingMessages, setLoadingMessages] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [recordingUsers, setRecordingUsers] = useState([]);

  const freshConversation = conversations.find(
    (c) => String(c._id) === String(selectedConversation?._id)
  );

  // --------------------------------------------------
  // LOAD MESSAGES
  // --------------------------------------------------
  useEffect(() => {
    const load = async () => {
      if (
        !selectedConversation?._id ||
        selectedConversation?.mock ||
        String(selectedConversation._id).startsWith("mock-")
      ) {
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      setLoadingMessages(true);
      try {
        const res = await api.get(
          `/messages/conversation/${selectedConversation._id}`
        );
        const data = Array.isArray(res.data) ? res.data : [];
        data.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
        );
        setMessages(data);
      } catch (err) {
        console.error(err);
      }
      setLoadingMessages(false);
    };

    load();
  }, [selectedConversation?._id, selectedConversation?.mock]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --------------------------------------------------
  // SOCKET EVENTS (NO CALL EVENTS HERE)
  // --------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (
        String(msg.conversationId) ===
        String(selectedConversation?._id)
      ) {
        setMessages((prev) =>
          prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]
        );
      }
    };
const handleGroupCallActive = ({ conversationId, callType }) => {
  setConversations(prev =>
    prev.map(c =>
      String(c._id) === String(conversationId)
        ? {
            ...c,
            hasActiveCall: true,
            activeCallType: callType,
          }
        : c
    )
  );
};
const handleGroupCallEnded = ({ conversationId }) => {
  setConversations(prev =>
    prev.map(c =>
      String(c._id) === String(conversationId)
        ? {
            ...c,
            hasActiveCall: false,
            activeCallType: null,
          }
        : c
    )
  );
};
 
    const handleMessagesSeen = ({ conversationId, userId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          String(m.conversationId) === String(conversationId)
            ? {
                ...m,
                seenBy: m.seenBy?.includes(userId)
                  ? m.seenBy
                  : [...(m.seenBy || []), userId],
              }
            : m
        )
      );
    };

    const handleTyping = ({ conversationId, userId }) => {
      if (
        String(conversationId) !== String(selectedConversation?._id) ||
        String(userId) === String(currentUser._id)
      )
        return;

      setTypingUsers((p) =>
        p.includes(userId) ? p : [...p, userId]
      );
    };

    const handleStopTyping = ({ conversationId, userId }) => {
      if (String(conversationId) !== String(selectedConversation?._id)) return;
      setTypingUsers((p) => p.filter((id) => id !== userId));
    };

    const handleRecording = ({ conversationId, userId }) => {
      if (
        String(conversationId) !== String(selectedConversation?._id) ||
        String(userId) === String(currentUser._id)
      )
        return;

      setRecordingUsers((p) =>
        p.includes(userId) ? p : [...p, userId]
      );
    };

    const handleStopRecording = ({ conversationId, userId }) => {
      if (String(conversationId) !== String(selectedConversation?._id)) return;
      setRecordingUsers((p) => p.filter((id) => id !== userId));
    };

    const handleMessageUpdated = ({ messageId, newText }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, text: newText }
            : m
        )
      );

      setConversations((prev) =>
        prev.map((c) =>
          c._id === selectedConversation?._id &&
          c.lastMessage?._id === messageId
            ? {
                ...c,
                lastMessage: { ...c.lastMessage, text: newText },
              }
            : c
        )
      );
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("recording", handleRecording);
    socket.on("stopRecording", handleStopRecording);
    socket.on("messageUpdated", handleMessageUpdated);
    socket.on("groupCallActive", handleGroupCallActive);
    socket.on("groupCallEnded", handleGroupCallEnded);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("recording", handleRecording);
      socket.off("stopRecording", handleStopRecording);
      socket.off("messageUpdated", handleMessageUpdated);
      socket.off("groupCallActive", handleGroupCallActive);
      socket.off("groupCallEnded", handleGroupCallEnded);

    };
  }, [socket, selectedConversation?._id, currentUser?._id]);

  // --------------------------------------------------
  // MARK AS SEEN
  // --------------------------------------------------
  useEffect(() => {
    if (!selectedConversation?._id || selectedConversation?.mock) return;

    const cid = String(selectedConversation._id);
    const uid = String(currentUser._id);
    const key = `${cid}-${uid}`;

    const hasUnseen = messages.some(
      (m) => String(m.sender?._id) !== uid && !m.seenBy?.includes(uid)
    );

    if (!hasUnseen || seenRequestRef.current[key]) return;
    seenRequestRef.current[key] = true;

    api.put(`/messages/seen/${cid}`).catch(() => {
      delete seenRequestRef.current[key];
    });
  }, [messages, selectedConversation?._id]);

  // --------------------------------------------------
  // CALL ACTIONS (OUTGOING + REJOIN ONLY)
  // --------------------------------------------------
  const handleStartCall = (type) => {
    if (!selectedConversation) return;

    const roomID = selectedConversation.isGroup
      ? selectedConversation._id
      : [currentUser._id, selectedConversation.userId].sort().join("_");

    socket.emit("callUser", {
      conversationId: selectedConversation._id,
      userToCall: selectedConversation.userId,
      from: currentUser._id,
      name: currentUser.username,
      roomID,
      callType: type,
    });

    window.open(
      `/call/${roomID}?type=${type}&user=${currentUser._id}&name=${currentUser.username}`,
      "_blank",
      "width=800,height=600"
    );
  };

  const handleRejoinCall = () => {
    if (!freshConversation?.hasActiveCall) return;

    window.open(
      `/call/${freshConversation._id}?type=${freshConversation.activeCallType}&user=${currentUser._id}&name=${currentUser.username}&rejoin=true`,
      "_blank",
      "width=800,height=600"
    );
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  const title =
    selectedConversation?.name ||
    selectedConversation?.username ||
    "Chat";

  const isOnline = selectedConversation?.userId
    ? onlineUsers.includes(String(selectedConversation.userId))
    : false;

  return (
    <Flex flex={70} bg={containerBg} p={4} flexDir="column">
      {/* HEADER */}
      <Flex h={12} align="center">
              {profilePic ? (
                <Avatar src={profilePic} w={9} h={9}>
        {isOnline && !selectedConversation?.isGroup && (
          <AvatarBadge
            boxSize="1rem"
            bg="green.400"
          />
        )}
      </Avatar>
      
              ) : (
                <Flex
                  w="36px"
                  h="36px"
                  borderRadius="full"
                  align="center"
                  justify="center"
                  bg={getAvatarColor(title)}
                  color="white"
                  fontWeight="bold"
                >
                  {getInitials(title)}
                </Flex>
              )}
      
            <Flex ml={2} direction="column">
        <Text fontWeight="bold">{title}</Text>
      
        {/* STATUS TEXT (Telegram style) */}
        {recordingUsers.length ? (
          <Text fontSize="xs" color="blue.500" fontStyle="italic">
            Recording voice message...
          </Text>
        ) : typingUsers.length ? (
          <Text fontSize="xs" color="blue.500">
            Typing...
          </Text>
        ) : (
          <Text
        fontSize="xs"
        color={isOnline ? "green.400" : "gray.500"}
      >
        {isOnline ? "Online" : "Offline"}
      </Text>
        )}
      </Flex>
      {freshConversation?.isGroup &&
       freshConversation?.hasActiveCall && (
        <Button
          size="sm"
          colorScheme="green"
          onClick={handleRejoinCall}
        >
          Join
        </Button>
      )}
      
      
      
      
              <Flex ml="auto" gap={2}>
                  <>
                    <Tooltip label="Audio Call">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        icon={<FiPhone />}
                        onClick={() => handleStartCall("audio")}
                      />
                    </Tooltip>
      
                    <Tooltip label="Video Call">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        icon={<FiVideo />}
                        onClick={() => handleStartCall("video")}
                      />
                    </Tooltip>
                  </>
      
                <Menu>
                  <MenuButton as={IconButton} icon={<CiMenuKebab />} size="sm" />
                  <MenuList>
                    <MenuItem>View Profile</MenuItem>
                  </MenuList>
                </Menu>
              </Flex>
            </Flex>

      <Divider my={2} />

      <Flex flexGrow={1} overflowY="auto" p={4} flexDir="column" gap={4}>
        {loadingMessages ? (
          <Text textAlign="center" color="gray.400">
            Loading…
          </Text>
        ) : messages.length === 0 ? (
          <Flex flex={1} align="center" justify="center" flexDir="column">
            <Text fontSize="xl" fontWeight="bold" color="gray.400">
              👋 Say Hello!
            </Text>
            <Text fontSize="md" color="gray.500">
              Start a new conversation…
            </Text>
          </Flex>
        ) : (
          messages.map((m) => (
            <Message
              key={m._id}
              message={m}
              ownMessage={
                String(m.sender?._id) === String(currentUser._id)
              }
            />
          ))
        )}
        <div ref={messageEndRef} />
      </Flex>

      <MessageInput setMessages={setMessages} />
    </Flex>
  );
};

export default MessageContainer;
