// MessageContainer.jsx — FINAL (Telegram-Safe + Full Phone/Video Call + Avatar Fallback + REALTIME EDIT + TYPING)

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
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
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

import incomingRingtone from "../assets/sounds/incomeRing.mp3";
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
// const [activeGroupCall, setActiveGroupCall] = useState(null);
const [activeCallType, setActiveCallType] = useState("audio");

  const setEditingMessage = useSetRecoilState(editingMessageAtom);

  const currentUser = useRecoilValue(userAtom);
  const { socket, onlineUsers } = useSocket();

  const toast = useToast();
  const containerBg = useColorModeValue("white", "gray.800");

  const messageEndRef = useRef(null);
  const seenRequestRef = useRef({});
  const incomingToneRef = useRef(null);
  const callEndedShownRef = useRef(false);

  const [loadingMessages, setLoadingMessages] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [recordingUsers, setRecordingUsers] = useState([]);

  // ----- CALL -----
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [isIncomingCallModalOpen, setIsIncomingCallModalOpen] = useState(false);
  const [activeCallWindow, setActiveCallWindow] = useState(null);
const [isInCall, setIsInCall] = useState(false);
const freshConversation = conversations.find(
  (c) => String(c._id) === String(selectedConversation?._id)
);

const handleRejoinCall = () => {
  if (!freshConversation?.hasActiveCall) return;

  const roomID = freshConversation._id;
  const type = freshConversation.activeCallType || "audio";

  socket.emit("rejoinCall", { roomID });

  window.open(
    `/call/${roomID}?type=${type}&user=${currentUser._id}&name=${currentUser.username}&rejoin=true`,
    "_blank",
    "width=800,height=600"
  );
};






  // =====================================================
  //  RINGTONE
  // =====================================================
  // useEffect(() => {
  //   incomingToneRef.current = new Audio(incomingRingtone);
  //   incomingToneRef.current.loop = true;
  //   return () => incomingToneRef.current?.pause();
  // }, []);

  // const startIncomingTone = () => {
  //   try {
  //     incomingToneRef.current?.play();
  //   } catch {}
  // };

  // const stopIncomingTone = () => {
  //   try {
  //     incomingToneRef.current?.pause();
  //     incomingToneRef.current.currentTime = 0;
  //   } catch {}
  // };

  // =====================================================
  // LOAD MESSAGES (Telegram-safe)
  // =====================================================
  useEffect(() => {
    const load = async () => {
      if (
        !selectedConversation?._id ||
        selectedConversation.mock ||
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
        console.error("Load messages error:", err);
      }
      setLoadingMessages(false);
    };

    load();
  }, [selectedConversation?._id, selectedConversation?.mock, setMessages]);

  // Scroll bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // =====================================================
  // SOCKET EVENTS (NEW MESSAGE, SEEN, TYPING, CALL FLOW, EDIT)
  // =====================================================
  useEffect(() => {
    if (!socket) return;


//     socket.on("callStarted", ({ roomID }) => {
//   setActiveGroupCall(roomID);
//   setIsInCall(true);
// });

// socket.on("roomEnded", ({ roomID, conversationId }) => {
//   if (
//     activeGroupCall === roomID &&
//     String(selectedConversation?._id) === String(conversationId)
//   ) {
//     setActiveGroupCall(null);
//     setActiveCallType("audio");
//   }
// });



    /* ---------- NEW MESSAGE ---------- */
   const handleNewMessage = (msg) => {
  const cid = String(msg.conversationId);
  const myId = String(currentUser._id);

  if (selectedConversation && String(selectedConversation._id) === cid) {
    setMessages((prev) => {
      if (prev.some((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
  }

};


    /* ---------- SEEN ---------- */
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

    /* ---------- TYPING ---------- */
    const handleTyping = ({ conversationId, userId }) => {
      if (
        String(conversationId) !== String(selectedConversation?._id) ||
        String(userId) === String(currentUser._id)
      )
        return;

      setTypingUsers((prev) =>
        prev.includes(String(userId)) ? prev : [...prev, String(userId)]
      );
    };

    const handleStopTyping = ({ conversationId, userId }) => {
      if (String(conversationId) !== String(selectedConversation?._id)) return;

      setTypingUsers((prev) => prev.filter((id) => id !== String(userId)));
    };
// ==============================
// RECORDING STATUS HANDLERS
// ==============================
const handleRecording = ({ conversationId, userId }) => {
  if (
    String(conversationId) !== String(selectedConversation?._id) ||
    String(userId) === String(currentUser._id)
  )
    return;

  setRecordingUsers((prev) =>
    prev.includes(userId) ? prev : [...prev, userId]
  );
};

const handleStopRecording = ({ conversationId, userId }) => {
  if (String(conversationId) !== String(selectedConversation?._id)) return;

  setRecordingUsers((prev) =>
    prev.filter((id) => id !== userId)
  );
};
    // =====================================================
    // REAL-TIME MESSAGE EDIT EVENT
    // =====================================================
    const handleMessageUpdated = ({ messageId, newText }) => {
      // Update messages
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, text: newText, updatedAt: new Date().toISOString() }
            : m
        )
      );

      // Update conversation lastMessage
      setConversations((prev) =>
        prev.map((c) =>
          c._id === selectedConversation?._id &&
          c.lastMessage?._id === messageId
            ? {
                ...c,
                lastMessage: {
                  ...c.lastMessage,
                  text: newText,
                  updatedAt: new Date().toISOString(),
                },
              }
            : c
        )
      );
    };

    /* ---------- CALL EVENTS ---------- */
    // const handleIncomingCall = ({ from, name, callType, roomID }) => {
    //   if (activeCallWindow && !activeCallWindow.closed) {
    //     socket.emit("callRejected", { to: from, roomID });
    //     return;
    //   }

    //   setIncomingCallData({ from, name, callType, roomID });
    //   setIsIncomingCallModalOpen(true);
    //   callEndedShownRef.current = false;
    //   startIncomingTone();
    // };

    const handleCallAccepted = ({ roomID }) => {
      if (activeCallWindow && !activeCallWindow.closed) {
        activeCallWindow.postMessage({ type: "call-accepted", roomID }, "*");
      }
    };

    const endCall = (msg, status) => {
      if (!callEndedShownRef.current) {
        toast({ title: msg, status });
        callEndedShownRef.current = true;
      }

      stopIncomingTone();

      if (activeCallWindow && !activeCallWindow.closed) {
        activeCallWindow.close();
      }

      setActiveCallWindow(null);
      setIncomingCallData(null);
      setIsIncomingCallModalOpen(false);
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("recording", handleRecording);
    socket.on("stopRecording", handleStopRecording);
    socket.on("messageUpdated", handleMessageUpdated);

    // socket.on("incomingCall", handleIncomingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callEnded", () => endCall("Call ended", "info"));
    socket.on("callRejected", () => endCall("Call rejected", "error"));
    socket.on("callTimeout", () => endCall("Missed call", "info"));

    const interval = setInterval(() => {
      if (activeCallWindow && activeCallWindow.closed) {
        endCall("Call ended", "info");
      }
    }, 200);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("typing", handleTyping);
      socket.off("recording", handleRecording);
      socket.off("stopRecording", handleStopRecording);
      socket.off("stopTyping", handleStopTyping);
      socket.off("messageUpdated", handleMessageUpdated);

      // socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callEnded");
      socket.off("callRejected");
      socket.off("callTimeout");

      clearInterval(interval);
    };
  }, [
    socket,
    selectedConversation?._id,
    currentUser?._id,
    activeCallWindow,
    toast,
    setMessages,
    setConversations,
  ]);

  // =====================================================
  // MARK AS SEEN
  // =====================================================
  useEffect(() => {
    if (
      !selectedConversation?._id ||
      selectedConversation?.mock ||
      !currentUser?._id
    )
      return;

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
  }, [messages, selectedConversation?._id, selectedConversation?.mock, currentUser?._id]);

  // =====================================================
  // CALL ACTIONS
  // =====================================================
  const handleAnswerIncomingCall = () => {
    const d = incomingCallData;
    if (!d) return;
 setActiveCallType(d.callType);
    stopIncomingTone();
    setIsIncomingCallModalOpen(false);

socket.emit("answerCall", { roomID: d.roomID });

    const win = window.open(
      `/call/${d.roomID}?type=${d.callType}&user=${currentUser._id}&name=${currentUser.username}&accepted=true`,
      "_blank",
      "width=800,height=600"
    );

    setActiveCallWindow(win);
  };

  const handleRejectIncomingCall = () => {
    const d = incomingCallData;
    if (!d) return;

    socket.emit("callRejected", { to: d.from, roomID: d.roomID });

    stopIncomingTone();
    setIncomingCallData(null);
    setIsIncomingCallModalOpen(false);
  };

  const handleStartCall = (type) => {
    setActiveCallType(type);
  if (selectedConversation?.isGroup) {
    const conversationId = selectedConversation._id;
    const roomID = conversationId; 
    socket.emit("callUser", {
      conversationId,
      from: currentUser._id,
      name: currentUser.username,
      roomID,
      callType: type,
    });

    const win = window.open(
      `/call/${roomID}?type=${type}&user=${currentUser._id}&name=${currentUser.username}`,
      "_blank",
      "width=800,height=600"
    );
    setActiveCallWindow(win);
  } else {
    if (!selectedConversation?.userId) return;
    const receiver = selectedConversation.userId;
    const roomID = [currentUser._id, receiver].sort().join("_");

    socket.emit("callUser", {
      userToCall: receiver,
      from: currentUser._id,
      name: currentUser.username,
      roomID,
      callType: type,
    });

    const win = window.open(
      `/call/${roomID}?type=${type}&user=${currentUser._id}&name=${currentUser.username}`,
      "_blank",
      "width=800,height=600"
    );
    setActiveCallWindow(win);
  }
};

  // =====================================================
  // UI
  // =====================================================
  const title =
    selectedConversation?.name ||
    selectedConversation?.username ||
    "Chat";

  const isOnline = selectedConversation?.userId
    ? onlineUsers.includes(String(selectedConversation.userId))
    : false;

  const profilePic =
    selectedConversation?.userProfilePic?.url ||
    selectedConversation?.userProfilePic ||
    "";

const statusText = recordingUsers.length
  ? "Recording voice message..."
  : typingUsers.length
  ? "Typing..."
  : isOnline
  ? "Online"
  : "Offline";

  const showGreenBadge = isOnline && selectedConversation?.userId;


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
        ) : (
          messages.length === 0 ? (
            <Flex
              flex={1}
              align="center"
              justify="center"
              flexDir="column"
              textAlign="center"
              h="100%"
              p={8}
            >
              <Text fontSize="xl" fontWeight="bold" color="gray.400">
                👋 Say Hello!
              </Text>
              <Text fontSize="md" color="gray.500">
                Start a new conversation ..........
              </Text>
            </Flex>
          ) : (
            messages.map((m) => (
              <Message
                key={m._id}
                message={m}
                ownMessage={String(m.sender?._id) === String(currentUser._id)}
              />
            ))
          )
        )}
        <div ref={messageEndRef} />
      </Flex>

      <MessageInput setMessages={setMessages} />

      {/* INCOMING CALL MODAL */}
      {/* {incomingCallData && (
        <Modal isOpen={isIncomingCallModalOpen} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              {incomingCallData.callType.toUpperCase()} Call
            </ModalHeader>

            <ModalBody>
              <Text>
                <b>{incomingCallData.name}</b> is calling…
              </Text>
            </ModalBody>

            <ModalFooter gap={3}>
              <Button colorScheme="red" onClick={handleRejectIncomingCall}>
                Reject
              </Button>
              <Button colorScheme="green" onClick={handleAnswerIncomingCall}>
                Answer
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )} */}
    </Flex>
  );
};

export default MessageContainer;