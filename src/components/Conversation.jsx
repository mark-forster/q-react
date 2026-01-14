import React, { useState } from "react";
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
  Portal,
} from "@chakra-ui/react";

import { useRecoilValue, useRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import {
  selectedConversationAtom,
  conversationsAtom,
} from "../atoms/messageAtom";

import { CiMenuKebab } from "react-icons/ci";
import { BsCheckAll } from "react-icons/bs";
import { useSocket } from "../context/SocketContext";
import { FiPhone, FiVideo, FiPhoneMissed, FiX } from "react-icons/fi";

import { getInitials, getAvatarColor } from "../utils/avatarHelpers";

const Conversation = ({
  conversation,
  isOnline,
  onDelete,
  onOpenGroupProfile,
  onOpenUserProfile,
  deletingId,
}) => {
  const currentUser = useRecoilValue(userAtom);
  const [conversations, setConversations] = useRecoilState(conversationsAtom);
  const [selectedConversation, setSelectedConversation] = useRecoilState(
    selectedConversationAtom
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const { socket } = useSocket();

  // Merge from  list
  const merged =
    conversations.find((c) => c._id === conversation._id) || conversation;

  const isGroup = merged.isGroup === true;

  const friend = !isGroup
    ? merged.participants?.find((p) => p?._id !== currentUser?._id)
    : null;

  const chatName = isGroup
    ? merged.name || "Group Chat"
    : friend?.name || friend?.username || "Unknown";

  const pic = friend?.profilePic;
  const profilePic = typeof pic === "string" ? pic : pic?.url || "";

  const lastMessage = merged.lastMessage;
  const lastText = lastMessage?.text;
  const callInfo = lastMessage?.callInfo;

  const unread = Number(merged.unreadCount || 0);
  const selectedBg = useColorModeValue("gray.200", "#243b53");
  const hoverBg = useColorModeValue("gray.100", "#334e68");

  // Click conversation
  const onClick = () => {
    if (isGroup) {
      setSelectedConversation({
        _id: merged._id,
        userId: "group-id",
        username: "Group Chat",
        name: chatName,
        userProfilePic: null,
        isGroup: true,
        participants: merged.participants,
      });
    } else {
      setSelectedConversation({
        _id: merged._id,
        userId: friend?._id,
        username: friend?.username,
        name: chatName,
        userProfilePic: profilePic,
        isGroup: false,
      });
    }

    setConversations((prev) =>
      prev.map((c) => (c._id === merged._id ? { ...c, unreadCount: 0 } : c))
    );

    socket?.emit("joinConversationRoom", { conversationId: merged._id });
  };

  // Delete chat handler
  const handleDelete = async () => {
    if (!onDelete) return;
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      await onDelete(merged._id);
    } finally {
      setIsDeleting(false);
    }
  };

  // Seen indicator
  const lastSenderId = lastMessage?.sender?._id || lastMessage?.sender || null;

  const meId = String(currentUser?._id);
  const friendId = String(friend?._id);

  const seenList = lastMessage?.seenBy ? lastMessage.seenBy.map(String) : [];

  const isSeen =
    !isGroup &&
    lastMessage &&
    String(lastSenderId) === meId &&
    seenList.includes(friendId);

  const renderPreview = () => {
    if (callInfo) {
      let icon =
        callInfo.callType === "audio" ? (
          <FiPhone size={14} />
        ) : (
          <FiVideo size={14} />
        );

      let previewText = "";
      let color = "gray.500";

      if (["missed", "timeout"].includes(callInfo.status)) {
        icon = <FiPhoneMissed size={14} />;
        previewText =
          callInfo.callType === "audio" ? "Missed call" : "Missed video call";
        color = "red.500";
      } else if (
        ["declined", "rejected", "cancelled"].includes(callInfo.status)
      ) {
        icon = <FiX size={14} />;
        previewText = "Canceled call";
        color = "red.500";
      } else if (callInfo.status === "incoming") {
        previewText = "Incoming call";
        color = "green.500";
      } else if (callInfo.status === "outgoing") {
        previewText = "Outgoing call";
        color = "green.500";
      } else {
        previewText = "Call ended";
      }

      return (
        <Box display="flex" alignItems="center" gap={1} color={color}>
          {icon}
          <Text fontSize="xs">{previewText}</Text>
        </Box>
      );
    }

    if (!lastText) return "No messages yet";

    return lastText.length > 30 ? lastText.slice(0, 30) + "..." : lastText;
  };

  const initials = getInitials(chatName);
  const color = getAvatarColor(chatName);

  const isSelected = selectedConversation?._id === merged._id;

  return (
    <Flex
      gap={4}
      alignItems="center"
      p={2}
      borderRadius="md"
      cursor={
        isDeleting || deletingId === merged._id ? "not-allowed" : "pointer"
      }
      opacity={isDeleting || deletingId === merged._id ? 0.45 : 1}
      pointerEvents={isDeleting || deletingId === merged._id ? "none" : "auto"}
      _hover={{ bg: hoverBg }}
      bg={isSelected ? selectedBg : "transparent"}
      onClick={onClick}
    >
      <WrapItem>
        {isGroup ? (
          <Flex
            w="38px"
            h="38px"
            borderRadius="full"
            align="center"
            justify="center"
            fontWeight="bold"
            color="white"
            bg={color}
          >
            {initials}
          </Flex>
        ) : profilePic ? (
          <Avatar size="sm" src={profilePic}>
            <AvatarBadge boxSize="1em" bg={isOnline ? "green.500" : "orange"} />
          </Avatar>
        ) : (
          <Flex
            w="38px"
            h="38px"
            borderRadius="full"
            align="center"
            justify="center"
            fontWeight="bold"
            color="white"
            bg={color}
          >
            {getInitials(chatName, friend?.username)}
          </Flex>
        )}
      </WrapItem>

      <Stack spacing={0} w="full" overflow="hidden">
        <Flex justify="space-between" align="center">
          <Text fontWeight={700} noOfLines={1}>
            {chatName}
          </Text>

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
        </Flex>

        <Flex fontSize="xs" alignItems="center" gap={1}>
          {renderPreview()}
          {!isGroup && lastText && String(lastSenderId) === meId && (
            <BsCheckAll size={16} color={isSeen ? "#4299E1" : "#A0AEC0"} />
          )}
        </Flex>

        {isGroup && (
          <Text fontSize="xs" color="gray.500">
            {merged.participants?.length || 0} members
          </Text>
        )}
      </Stack>

      {/* Menu*/}
      <Box
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Menu>
          <MenuButton
            as={IconButton}
            icon={<CiMenuKebab />}
            size="sm"
            variant="ghost"
            onClick={(e) => e.stopPropagation()}
          />
          <Portal>
            <MenuList
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {/* VIEW */}
              <MenuItem
                onClick={() => {
                  if (isGroup) {
                    onOpenUserProfile &&
                      onOpenUserProfile({
                        ...merged,
                        isGroup: true,
                      });
                  } else {
                    onOpenUserProfile && onOpenUserProfile(friend);
                  }
                }}
              >
                {isGroup ? "View Group" : "View User"}
              </MenuItem>

              {/* DELETE */}
              <MenuItem
                onClick={() => {
                  handleDelete();
                }}
              >
                {(isDeleting || deletingId === merged._id) && (
                  <Spinner size="sm" mr={2} />
                )}
                Delete Chat
              </MenuItem>
            </MenuList>
          </Portal>
        </Menu>
      </Box>
    </Flex>
  );
};

export default Conversation;
