// components/Conversation.jsx
import {
  Flex, Avatar, Text, useColorModeValue, Box, Menu, MenuButton,
  MenuList, MenuItem, IconButton, WrapItem, AvatarBadge, Stack, Spinner,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { useRecoilValue, useRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import { selectedConversationAtom, conversationsAtom } from "../atoms/messageAtom";
import { CiMenuKebab } from "react-icons/ci";
import { BsCheckAll, BsImage } from "react-icons/bs";
import { useSocket } from "../context/SocketContext";

const Conversation = ({ conversation, isOnline, onDelete }) => {
  const currentUser = useRecoilValue(userAtom);
  const [conversations, setConversations] = useRecoilState(conversationsAtom);
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const [isDeleting, setIsDeleting] = useState(false);
  const { socket } = useSocket();

  const merged = conversations.find((c) => c._id === conversation._id) || conversation;

  const friend = Array.isArray(merged.participants)
    ? merged.participants.find((p) => p?._id && p._id !== currentUser?._id)
    : null;

  const chatName = merged.isGroup ? (merged.name || "Group Chat") : (friend?.name || friend?.username || "Unknown");
  const pic = friend?.profilePic;
  const profilePic = typeof pic === "string" ? pic : pic?.url || "";

  const lastMessage = merged.lastMessage;
  const isSelected = selectedConversation?._id === merged._id;

  const selectedBg = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("gray.100", "gray.600");
  const menuBg = useColorModeValue("white", "gray.800");

  const unreadCount = Number(merged.unreadCount || 0);

  const handleClick = () => {
    if (isSelected) {
      setSelectedConversation(null);
    } else {
      // select
      setSelectedConversation({
        _id: merged._id,
        userId: merged.isGroup ? "group-id" : (friend?._id || ""),
        username: merged.isGroup ? "Group Chat" : (friend?.username || friend?.name || ""),
        name: chatName,
        userProfilePic: profilePic,
        mock: merged.mock,
        isGroup: !!merged.isGroup,
      });
      // optimistic unread reset
      setConversations((prev) =>
        prev.map((c) => (c._id === merged._id ? { ...c, unreadCount: 0 } : c))
      );
      // ensure room joined (edge: newly created conv)
      socket?.emit("joinConversationRoom", { conversationId: merged._id });
    }
  };

  const handleDeleteClick = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete?.(merged._id);
    } finally {
      setIsDeleting(false);
    }
  };

  const lastSenderId =
    (typeof lastMessage?.sender === "object" && lastMessage?.sender?._id) ||
    lastMessage?.sender ||
    lastMessage?.senderId ||
    lastMessage?.from ||
    null;

  const meId = String(currentUser?._id || "");
  const friendId = String(friend?._id || "");
  const seenByList = Array.isArray(lastMessage?.seenBy) ? lastMessage.seenBy.map(String) : [];
  const isSeen = !!lastMessage && !!meId && String(lastSenderId) === meId && seenByList.includes(friendId);

  return (
    <Flex
      gap={4}
      alignItems="center"
      p="2"
      _hover={{ cursor: "pointer", bg: hoverBg, borderRadius: "md" }}
      bg={isSelected ? selectedBg : "transparent"}
      borderRadius="md"
      position="relative"
      onClick={handleClick}
    >
      <Flex flex={1} alignItems="center" gap={4}>
        <WrapItem>
          <Avatar size={{ base: "xs", sm: "sm", md: "md" }} src={profilePic}>
            {typeof isOnline === "boolean" && (
              <AvatarBadge boxSize="1em" bg={isOnline ? "green.500" : "orange.500"} />
            )}
          </Avatar>
        </WrapItem>

        <Stack direction="column" fontSize="sm" overflow="hidden" spacing={0}>
          <Text fontWeight={700} noOfLines={1}>{chatName}</Text>

          <Text fontSize="xs" display="flex" alignItems="center" gap={1} whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">
            {lastMessage?.text ? (
              <Box as="span">
                {lastMessage.text.length > 30 ? `${lastMessage.text.substring(0, 30)}...` : lastMessage.text}
              </Box>
            ) : (Array.isArray(lastMessage?.attachments) && lastMessage.attachments.length > 0) ? (
              <Box display="flex" alignItems="center" gap={1}>
                <BsImage size={16} />
                <Text as="span">Image</Text>
              </Box>
            ) : (
              <Box as="span" color="gray.400">No messages yet</Box>
            )}

            {lastMessage && currentUser?._id && (String(lastSenderId) === meId) && (
              <BsCheckAll size={16} color={isSeen ? "#4299E1" : "#A0AEC0"} />
            )}
          </Text>
        </Stack>
      </Flex>

      {/* Telegram-style unread badge */}
      <Flex direction="column" alignItems="flex-end" justifyContent="center" minW="60px">
        {unreadCount > 0 && (
          <Flex
            bg="green.500"
            color="white"
            borderRadius="full"
            px={2}
            py={1}
            fontSize="xs"
            fontWeight="bold"
            alignItems="center"
            justifyContent="center"
            mt={1}
            minW="25px"
            h="20px"
          >
            {unreadCount}
          </Flex>
        )}
      </Flex>

      {typeof onDelete === "function" && (
        <Menu>
          <MenuButton as={IconButton} icon={<CiMenuKebab />} variant="ghost" size="sm" _hover={{ bg: "transparent" }} />
          <MenuList bg={menuBg}>
            <MenuItem onClick={handleDeleteClick} isDisabled={isDeleting}>
              {isDeleting ? <Spinner size="sm" mr={2} /> : null}
              {isDeleting ? "Deleting..." : "Delete"}
            </MenuItem>
          </MenuList>
        </Menu>
      )}
    </Flex>
  );
};

export default Conversation;
