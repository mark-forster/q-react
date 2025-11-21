import {
  Flex,
  Avatar,
  Text,
  useColorModeValue,
  Box,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  WrapItem,
  AvatarBadge,
  Stack,
  Spinner,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { useRecoilValue, useRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import {
  selectedConversationAtom,
  conversationsAtom,
} from "../atoms/messageAtom";

import { CiMenuKebab } from "react-icons/ci";
import { BsImage, BsCheckAll } from "react-icons/bs";
import { useSocket } from "../context/SocketContext";
import { FiPhone, FiVideo, FiPhoneMissed, FiX } from "react-icons/fi"; // Icons ထပ်ထည့်

const Conversation = ({ conversation, isOnline, onDelete }) => {
  const currentUser = useRecoilValue(userAtom);
  const [conversations, setConversations] = useRecoilState(conversationsAtom);
  const [selectedConversation, setSelectedConversation] = useRecoilState(
    selectedConversationAtom
  );

  const [isDeleting, setIsDeleting] = useState(false);

  const { socket } = useSocket();

  const merged =
    conversations.find((c) => c._id === conversation._id) || conversation;

  // friend
  const friend = Array.isArray(merged.participants)
    ? merged.participants.find((p) => p?._id && p._id !== currentUser?._id)
    : null;

  const chatName = merged.isGroup
    ? merged.name || "Group Chat"
    : friend?.name || friend?.username || "Unknown";

  const pic = friend?.profilePic;
  const profilePic = typeof pic === "string" ? pic : pic?.url || "";

  const lastMessage = merged.lastMessage;
  const lastText = lastMessage?.text;
  const callInfo = lastMessage?.callInfo; // callInfo ကို ထုတ်ယူ

  const unread = Number(merged.unreadCount || 0);

  const selectedBg = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("gray.100", "gray.600");

  const onClick = () => {
    if (selectedConversation?._id === merged._id) {
      setSelectedConversation(null);
      return;
    }

    setSelectedConversation({
      _id: merged._id,
      userId: merged.isGroup ? "group-id" : friend?._id,
      username: merged.isGroup ? "Group Chat" : friend?.username,
      name: chatName,
      userProfilePic: profilePic,
      isGroup: merged.isGroup,
    });

    setConversations((prev) =>
      prev.map((c) => (c._id === merged._id ? { ...c, unreadCount: 0 } : c))
    );

    socket?.emit("joinConversationRoom", { conversationId: merged._id });
  };

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await onDelete?.(merged._id);
    } finally {
      setIsDeleting(false);
    }
  };

  // detect sender
  const lastSenderId =
    (typeof lastMessage?.sender === "object" &&
      lastMessage?.sender?._id) ||
    lastMessage?.sender ||
    null;

  const meId = String(currentUser?._id || "");
  const friendId = String(friend?._id || "");

  const seenList = Array.isArray(lastMessage?.seenBy)
    ? lastMessage.seenBy.map(String)
    : [];

  const isSeen =
    lastMessage && String(lastSenderId) === meId && seenList.includes(friendId);

  // ================================
  // CALL PREVIEW RENDERING (Updated)
  // ================================
  const renderPreview = () => {
    if (callInfo) {
      const isAudio = callInfo.callType === "audio";
      let icon = isAudio ? <FiPhone size={14} /> : <FiVideo size={14} />;
      let previewText = "";
      let color = "gray.500";

      if (callInfo.status === "missed" || callInfo.status === "timeout") {
        previewText = isAudio ? "Missed call" : "Missed video call";
        icon = <FiPhoneMissed size={14} />;
        color = "red.500";
      } else if (callInfo.status === "declined" || callInfo.status === "rejected" || callInfo.status === "cancelled") {
        previewText = isAudio ? "Canceled call" : "Canceled video call";
        icon = <FiX size={14} />;
        color = "red.500";
      } else if (callInfo.status === "outgoing") {
        previewText = isAudio ? "Outgoing call" : "Outgoing video call";
        color = "green.500";
      } else if (callInfo.status === "incoming") {
        previewText = isAudio ? "Incoming call" : "Incoming video call";
        color = "green.500";
      } else if (callInfo.status === "completed") {
        previewText = "Call ended";
        color = "gray.500";
      }
      
      return (
        <Box display="flex" alignItems="center" gap={1} color={color}>
          {icon}
          <Text fontSize="xs">{previewText}</Text>
        </Box>
      );
    }

    if (!lastText) return "No messages yet";

    // normal text
    return lastText.length > 30 ? lastText.slice(0, 30) + "..." : lastText;
  };

  return (
    <Flex
      gap={4}
      alignItems="center"
      p={2}
      borderRadius="md"
      _hover={{ bg: hoverBg }}
      bg={selectedConversation?._id === merged._id ? selectedBg : "transparent"}
      onClick={onClick}
    >
      {/* AVATAR */}
      <WrapItem>
        <Avatar size="sm" src={profilePic}>
          <AvatarBadge
            boxSize="1em"
            bg={isOnline ? "green.500" : "orange.500"}
          />
        </Avatar>
      </WrapItem>

      {/* TEXT PREVIEW */}
      <Stack spacing={0} w="full" overflow="hidden">
        <Text fontWeight={700}>{chatName}</Text>

        <Flex fontSize="xs" alignItems="center" gap={1} overflow="hidden">
          {renderPreview()}

          {lastText && String(lastSenderId) === meId && (
            <BsCheckAll size={16} color={isSeen ? "#4299E1" : "#A0AEC0"} />
          )}
        </Flex>
      </Stack>

      {/* unread badge */}
      {unread > 0 && (
        <Flex
          bg="green.500"
          color="white"
          px={2}
          borderRadius="full"
          fontSize="xs"
          fontWeight="700"
        >
          {unread}
        </Flex>
      )}

      {/* menu */}
      <Menu>
        <MenuButton as={IconButton} size="sm" icon={<CiMenuKebab />} variant="ghost" />
        <MenuList>
          <MenuItem onClick={handleDelete} isDisabled={isDeleting}>
            {isDeleting ? <Spinner size="sm" mr={2} /> : null}
            Delete
          </MenuItem>
        </MenuList>
      </Menu>
    </Flex>
  );
};

export default Conversation;