// MessageContainer.jsx
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

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

const MessageContainer = () => {
  const [selectedConversation] = useRecoilState(selectedConversationAtom);
  const [messages, setMessages] = useRecoilState(messagesAtom);
  const setConversations = useSetRecoilState(conversationsAtom);

  const currentUser = useRecoilValue(userAtom);
  const { socket, onlineUsers } = useSocket();

  const toast = useToast();
  const messageEndRef = useRef(null);

  const [loadingMessages, setLoadingMessages] = useState(true);

  const [incomingCallData, setIncomingCallData] = useState(null);
  const [isIncomingCallModalOpen, setIsIncomingCallModalOpen] =
    useState(false);

  const [activeCallWindow, setActiveCallWindow] = useState(null);

  const callEndedShownRef = useRef(false);
  const incomingToneRef = useRef(null);

  // ✅ seen API ကို တပြန်တခါသာခေါ်ဖို့
  const seenRequestRef = useRef({}); // { "<conversationId>-<userId>": true }

  const isOnline =
    selectedConversation?.userId &&
    onlineUsers.includes(selectedConversation.userId);

  const containerBg = useColorModeValue("white", "gray.800");

  // ringtone
  useEffect(() => {
    incomingToneRef.current = new Audio(incomingRingtone);
    incomingToneRef.current.loop = true;

    return () => incomingToneRef.current?.pause();
  }, []);

  const startIncomingTone = () => {
    try {
      incomingToneRef.current?.play();
    } catch {}
  };

  const stopIncomingTone = () => {
    try {
      incomingToneRef.current?.pause();
      incomingToneRef.current.currentTime = 0;
    } catch {}
  };

  // ✅ Load messages when change conversation
  useEffect(() => {
    const load = async () => {
      if (!selectedConversation?._id) return;
      setLoadingMessages(true);
      try {
        const res = await api.get(
          `/messages/conversation/${selectedConversation._id}`
        );
        // backend မှာ sort already ခဲ့ပေမယ့် 여기서လည်း 한번 safety sort
        const data = Array.isArray(res.data) ? res.data : [];
        data.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
        );
        setMessages(data);
      } catch (e) {
        console.error("Load messages error", e);
      }
      setLoadingMessages(false);
    };
    load();
  }, [selectedConversation?._id, setMessages]);

  // ✅ Auto scroll bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const closeCallWindow = () => {
    if (activeCallWindow && !activeCallWindow.closed) {
      activeCallWindow.close();
    }
    setActiveCallWindow(null);
  };

  const handleEndCallLogic = () => {
    closeCallWindow();
    stopIncomingTone();
    setIncomingCallData(null);
    setIsIncomingCallModalOpen(false);
  };

  // ------------------------------------------------
  // ✅ SOCKET EVENTS (newMessage + seen + call events)
  // ------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    // ====== NEW_MESSAGE (call + normal) ======
    const handleNewMessage = (msg) => {
      // 1) Messages list ထဲမှာ မရှိတောင်မှ ထည့်မယ် (duplicate 방지)
      setMessages((prev) => {
        if (!msg?._id) return prev;

        const exists = prev.some((m) => m._id === msg._id);
        if (exists) return prev;

        const updated = [...prev, msg];
        updated.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
        );
        return updated;
      });

      // 2) Conversation list ကို update + reorder to top
      setConversations((prev) => {
        if (!prev || !prev.length) return prev;
        const cid =
          typeof msg.conversationId === "object"
            ? msg.conversationId.toString()
            : String(msg.conversationId || "");

        let found = false;
        const updated = prev.map((c) => {
          const cId =
            typeof c._id === "object" ? c._id.toString() : String(c._id);
          if (cId === cid) {
            found = true;
            const lastText =
              msg.text ||
              (Array.isArray(msg.attachments) &&
              msg.attachments.length > 0
                ? "Attachment"
                : "");
            return {
              ...c,
              lastMessage: {
                ...(c.lastMessage || {}),
                text: lastText,
                sender: msg.sender,
                updatedAt: msg.updatedAt || msg.createdAt,
                seenBy: c.lastMessage?.seenBy || [],
              },
              // receiver ဖက် only → unreadCount +1, sender ဖက်မှာတော့ မတက်စေချင်ရင် logic ထပ်ပြင်နိုင်
              unreadCount:
                msg.sender === currentUser?._id
                  ? c.unreadCount || 0
                  : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        });

        if (!found) return prev;

        const cidStr = String(
          typeof msg.conversationId === "object"
            ? msg.conversationId.toString()
            : msg.conversationId
        );
        const top = updated.find((c) =>
          (c._id || "").toString() === cidStr
        );
        const rest = updated.filter(
          (c) => (c._id || "").toString() !== cidStr
        );
        return top ? [top, ...rest] : updated;
      });
    };

    // ===== messagesSeen (server → everyone) =====
    const handleMessagesSeen = ({ conversationId, userId }) => {
      if (!conversationId || !userId) return;

      const cid = String(conversationId);
      const uid = String(userId);

      // Messages tick update
      setMessages((prev) =>
        prev.map((m) => {
          const mCid =
            typeof m.conversationId === "object"
              ? m.conversationId.toString()
              : String(m.conversationId || "");
          if (mCid !== cid) return m;

          const seenBy = Array.isArray(m.seenBy) ? m.seenBy.map(String) : [];
          if (seenBy.includes(uid)) return m;
          return {
            ...m,
            seenBy: [...seenBy, uid],
          };
        })
      );

      // Conversation.lastMessage seenBy update
      setConversations((prev) =>
        prev.map((c) => {
          const cId =
            typeof c._id === "object" ? c._id.toString() : String(c._id);
          if (cId !== cid) return c;

          const lb = c.lastMessage || {};
          const seenBy = Array.isArray(lb.seenBy)
            ? lb.seenBy.map(String)
            : [];
          if (seenBy.includes(uid)) return c;

          return {
            ...c,
            lastMessage: {
              ...lb,
              seenBy: [...seenBy, uid],
            },
            // current user ကို 제외하고, unreadCount ကို 0 သို့မဟုတ် 적절하게 내려ရင် ဒီမှာလုပ်နိုင်
          };
        })
      );
    };

    // ====== CALL EVENTS ======
    const handleIncomingCall = ({ from, name, callType, roomID }) => {
      if (activeCallWindow && !activeCallWindow.closed) {
        socket.emit("callRejected", { to: from, roomID });
        return;
      }
      setIncomingCallData({ from, name, callType, roomID });
      setIsIncomingCallModalOpen(true);
      callEndedShownRef.current = false;
      startIncomingTone();
    };

    const handleCallAccepted = ({ roomID }) => {
      if (activeCallWindow && !activeCallWindow.closed) {
        activeCallWindow.postMessage(
          { type: "call-accepted", roomID },
          "*"
        );
      }
    };

    const handleCallEnded = () => {
      if (!callEndedShownRef.current) {
        callEndedShownRef.current = true;
        toast({ title: "Call ended", status: "info" });
      }
      handleEndCallLogic();
    };

    const handleCallRejected = () => {
      toast({ title: "Call rejected", status: "error" });
      handleEndCallLogic();
    };

    const handleCallTimeout = () => {
      toast({ title: "Missed call", status: "info" });
      handleEndCallLogic();
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("incomingCall", handleIncomingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callEnded", handleCallEnded);
    socket.on("callRejected", handleCallRejected);
    socket.on("callTimeout", handleCallTimeout);

    // detect popup closed
    const interval = setInterval(() => {
      if (activeCallWindow && activeCallWindow.closed) {
        handleEndCallLogic();
      }
    }, 200);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callEnded", handleCallEnded);
      socket.off("callRejected", handleCallRejected);
      socket.off("callTimeout", handleCallTimeout);
      clearInterval(interval);
    };
  }, [
    socket,
    activeCallWindow,
    setMessages,
    setConversations,
    toast,
    currentUser?._id,
  ]);

  // ------------------------------------------------
  // ✅ When user open chat → mark messages as seen
  // ------------------------------------------------
  useEffect(() => {
    if (!selectedConversation?._id || !currentUser?._id) return;
    const cid = String(selectedConversation._id);
    const uid = String(currentUser._id);
    const key = `${cid}-${uid}`;

    // သင်မဖတ်ရသေးတဲ့ message ရှိ/မရှိ စစ်မယ်
    const hasUnseen = messages.some((m) => {
      const senderId = String(m.sender);
      if (senderId === uid) return false; // ကိုယ်ပို့တဲ့ message ကို ကိုယ်ဖတ်ပြီလို သတ်မှတ်မယ်

      const seenBy = Array.isArray(m.seenBy)
        ? m.seenBy.map(String)
        : [];
      return !seenBy.includes(uid);
    });

    if (!hasUnseen) return; // ဖတ်ပြီးသားဆိုရင် မခေါ်ရ

    if (seenRequestRef.current[key]) {
      // ဒီ convo/ဒီ user ကို အရင်ဆုံးကြေညာဖူးပြီ
      return;
    }

    seenRequestRef.current[key] = true;

    api
      .put(`/messages/seen/${cid}`)
      .catch((err) => {
        console.error("Seen API error:", err);
        // error ဖြစ်ရင် next render မှာ ပြန်ခေါ်အောင် flag ပြန်ဖျက်
        delete seenRequestRef.current[key];
      });
  }, [messages, selectedConversation?._id, currentUser?._id]);

  // ===== accept =====
  const handleAnswerIncomingCall = () => {
    const data = incomingCallData;
    if (!data) return;

    stopIncomingTone();
    setIsIncomingCallModalOpen(false);

    socket.emit("answerCall", { to: data.from, roomID: data.roomID });

    const url = `/call/${data.roomID}?type=${data.callType}&user=${currentUser._id}&name=${currentUser.username}&accepted=true`;

    const win = window.open(url, "_blank", "width=800,height=600");
    setActiveCallWindow(win);
  };

  // ===== reject =====
  const handleRejectIncomingCall = () => {
    const data = incomingCallData;
    if (!data) return;

    socket.emit("callRejected", { to: data.from, roomID: data.roomID });
    stopIncomingTone();
    setIncomingCallData(null);
    setIsIncomingCallModalOpen(false);
  };

  // ===== start outgoing =====
  const handleStartCall = (type) => {
    const receiver = selectedConversation?.userId;
    if (!receiver) return;

    const roomID = [currentUser._id, receiver].sort().join("_");

    socket.emit("callUser", {
      userToCall: receiver,
      from: currentUser._id,
      name: currentUser.username,
      roomID,
      callType: type,
    });

    const url = `/call/${roomID}?type=${type}&user=${currentUser._id}&name=${currentUser.username}`;
    const win = window.open(url, "_blank", "width=800,height=600");
    setActiveCallWindow(win);
  };

  const name = selectedConversation?.username;
  const profilePic =
    selectedConversation?.userProfilePic?.url || "/no-pic.jpeg";

  return (
    <Flex flex={70} bg={containerBg} p={4} flexDir="column">
      {/* HEADER */}
      <Flex w="100%" h={12} align="center">
        <Avatar src={profilePic} w={9} h={9}>
          {isOnline && <AvatarBadge boxSize="1em" bg="green.500" />}
        </Avatar>

        <Flex flexDir="column" ml={2}>
          <Text fontWeight="bold">{name}</Text>
          <Text fontSize="xs" color="gray.500">
            {isOnline ? "Online" : "Offline"}
          </Text>
        </Flex>

        <Flex ml="auto" gap={2}>
          {!activeCallWindow && isOnline && (
            <>
              <Tooltip label="Audio Call">
                <IconButton
                  size="sm"
                  icon={<FiPhone />}
                  variant="ghost"
                  onClick={() => handleStartCall("audio")}
                />
              </Tooltip>

              <Tooltip label="Video Call">
                <IconButton
                  size="sm"
                  icon={<FiVideo />}
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

      {/* Messages */}
      <Flex flexGrow={1} overflowY="auto" p={4} flexDir="column" gap={4}>
        {loadingMessages ? (
          <Text textAlign="center" color="gray.500">
            Loading…
          </Text>
        ) : (
          messages.map((m) => (
            <Message
              key={m._id}
              message={m}
              ownMessage={String(m.sender) === String(currentUser._id)}
            />
          ))
        )}
        <div ref={messageEndRef} />
      </Flex>

      <MessageInput setMessages={setMessages} />

      {/* Incoming Call Popup */}
      {incomingCallData && (
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
      )}
    </Flex>
  );
};

export default MessageContainer;
