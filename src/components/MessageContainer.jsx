// src/components/MessageContainer.jsx
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
} from "../atoms/messageAtom";
import userAtom from "../atoms/userAtom";

import { useRecoilState, useRecoilValue } from "recoil";
import { useSocket } from "../context/SocketContext";

import axios from "axios";
import { FiPhone, FiVideo } from "react-icons/fi";
import { CiMenuKebab } from "react-icons/ci";

import Message from "./Message";
import MessageInput from "./MessageInput";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

const MessageContainer = () => {
  const [selectedConversation] = useRecoilState(selectedConversationAtom);
  const [messages, setMessages] = useRecoilState(messagesAtom);

  const currentUser = useRecoilValue(userAtom);
  const { socket, onlineUsers } = useSocket();

  const toast = useToast();
  const messageEndRef = useRef(null);

  const [loadingMessages, setLoadingMessages] = useState(true);

  const [incomingCallData, setIncomingCallData] = useState(null);
  const [isIncomingCallModalOpen, setIsIncomingCallModalOpen] = useState(false);

  const [activeCallWindow, setActiveCallWindow] = useState(null);

  const callEndedShownRef = useRef(false); // 🔥 prevents multiple toast

  const isOnline =
    selectedConversation?.userId &&
    onlineUsers.includes(selectedConversation.userId);

  // LOAD MESSAGES
  useEffect(() => {
    const getMessages = async () => {
      if (!selectedConversation?._id) return;
      setMessages([]);
      setLoadingMessages(true);
      try {
        const res = await api.get(
          `/messages/conversation/${selectedConversation._id}`
        );
        setMessages(res.data || []);
      } catch {
        toast({ title: "Failed to load messages", status: "error" });
      } finally {
        setLoadingMessages(false);
      }
    };

    getMessages();
  }, [selectedConversation?._id]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const closeCallWindow = () => {
    if (activeCallWindow && !activeCallWindow.closed) {
      activeCallWindow.close();
    }
    setActiveCallWindow(null);
  };

  const handleEndCallLogic = (selfEnded = true) => {
    closeCallWindow();
    setIncomingCallData(null);
    setIsIncomingCallModalOpen(false);

    if (selfEnded && selectedConversation?.userId) {
      socket.emit("endCall", {
        to: selectedConversation.userId,
      });
    }
  };

  // SOCKET EVENTS
  useEffect(() => {
    if (!socket) return;

    socket.on("incomingCall", ({ from, name, callType, roomID }) => {
      if (activeCallWindow && !activeCallWindow.closed) {
        socket.emit("callRejected", { to: from, roomID });
        return;
      }

      setIncomingCallData({ from, name, callType, roomID });
      setIsIncomingCallModalOpen(true);
    });

    socket.on("callEnded", () => {
      if (!callEndedShownRef.current) {
        callEndedShownRef.current = true;
        toast({ title: "Call ended", status: "error" });
      }
      handleEndCallLogic(false);
    });

    socket.on("callRejected", () => {
      handleEndCallLogic(false);
    });

    socket.on("callTimeout", () => {
      handleEndCallLogic(false);
    });

    const interval = setInterval(() => {
      if (activeCallWindow && activeCallWindow.closed) {
        setActiveCallWindow(null);
        setIncomingCallData(null);
        setIsIncomingCallModalOpen(false);
      }
    }, 200);

    return () => {
      socket.off("incomingCall");
      socket.off("callEnded");
      socket.off("callRejected");
      socket.off("callTimeout");
      clearInterval(interval);
    };
  }, [socket, activeCallWindow]);

  // RECEIVE MESSAGE FROM POPUP
  useEffect(() => {
    const handler = (event) => {
      if (
        event.data?.type === "call-ended-by-peer" ||
        event.data?.type === "call-ended-self"
      ) {
        closeCallWindow();
        setIncomingCallData(null);
        setIsIncomingCallModalOpen(false);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [activeCallWindow]);

  // ACCEPT CALL
  const handleAnswerIncomingCall = () => {
    const data = incomingCallData;
    if (!data) return;

    callEndedShownRef.current = false;

    setIsIncomingCallModalOpen(false);

    socket.emit("answerCall", { to: data.from, roomID: data.roomID });

    const callURL = `/call/${data.roomID}?type=${data.callType}&user=${currentUser._id}&name=${currentUser.username}&accepted=true`;
    const newWindow = window.open(
      callURL,
      "_blank",
      "width=800,height=600,resizable=yes"
    );

    setActiveCallWindow(newWindow);
  };

  // REJECT CALL
  const handleRejectIncomingCall = () => {
    const d = incomingCallData;
    if (!d) return;

    socket.emit("callRejected", { to: d.from, roomID: d.roomID });

    setIncomingCallData(null);
    setIsIncomingCallModalOpen(false);
  };

  // OUTGOING CALL
  const handleStartCall = (type) => {
    const receiver = selectedConversation?.userId;
    if (!receiver) return;

    callEndedShownRef.current = false; // reset for next call

    if (activeCallWindow && !activeCallWindow.closed) {
      toast({ title: "Already in a call.", status: "warning" });
      return;
    }

    const roomID = [currentUser._id, receiver].sort().join("_");

    socket.emit("callUser", {
      userToCall: receiver,
      from: currentUser._id,
      name: currentUser.username,
      roomID,
      callType: type,
    });

    const callURL = `/call/${roomID}?type=${type}&user=${currentUser._id}&name=${currentUser.username}`;
    const newWindow = window.open(
      callURL,
      "_blank",
      "width=800,height=600,resizable=yes"
    );

    setActiveCallWindow(newWindow);
  };

  const containerBg = useColorModeValue("white", "gray.800");

  const callPartnerName =
    selectedConversation?.username || incomingCallData?.name;

  const callPartnerPic =
    selectedConversation?.userProfilePic?.url || "/no-pic.jpeg";

  return (
    <Flex flex={70} bg={containerBg} p={4} flexDir="column">
      {/* HEADER */}
      <Flex w="100%" h={12} align="center" gap={2}>
        <Avatar src={callPartnerPic} w={9} h={9}>
          {isOnline && <AvatarBadge boxSize="1em" bg="green.500" />}
        </Avatar>

        <Flex flexDir="column">
          <Text fontWeight="bold">{callPartnerName}</Text>
          <Text fontSize="xs" color="gray.500">
            {isOnline ? "Online" : "Offline"}
          </Text>
        </Flex>

        <Flex ml="auto" gap={2}>
          {!activeCallWindow && isOnline && (
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
      <Flex flexGrow={1} flexDir="column" overflowY="auto" p={4} gap={4}>
        {loadingMessages ? (
          <Text textAlign="center" color="gray.500">
            Loading messages…
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

      {/* INCOMING CALL MODAL */}
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
