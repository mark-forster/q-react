import {
  Flex, Avatar, Text, useColorModeValue, Box,
  Menu, MenuButton, MenuList, MenuItem, IconButton, WrapItem, AvatarBadge, Stack
} from "@chakra-ui/react";
import { useRecoilValue, useRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import { selectedConversationAtom, conversationsAtom } from "../atoms/messageAtom";
import { CiMenuKebab } from "react-icons/ci";
import { BsCheckAll, BsImage } from "react-icons/bs";

const Conversation = ({ conversation, isOnline, onDelete }) => {
  const currentUser = useRecoilValue(userAtom);
  const conversations = useRecoilValue(conversationsAtom);
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);

  // Always use the freshest version from global state (realtime updates)
  const merged = conversations.find(c => c._id === conversation._id) || conversation;

  // Find the friend (non-current user) robustly
  const friend = Array.isArray(merged.participants)
    ? merged.participants.find(p => p?._id && p._id !== currentUser?._id)
    : null;

  const chatName =
    merged.isGroup
      ? (merged.name || "Group Chat")
      : (friend?.name || friend?.username || "Unknown");

  // profilePic can be string or object with url
  const pic = friend?.profilePic;
  const profilePic = typeof pic === "string" ? pic : pic?.url || "";

  const lastMessage = merged.lastMessage;
  const isSelected = selectedConversation?._id === merged._id;

  const selectedBg = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("gray.100", "gray.600");
  const menuBg = useColorModeValue("white", "gray.800");

  const handleClick = () => {
    setSelectedConversation({
      _id: merged._id,
      userId: merged.isGroup ? "group-id" : (friend?._id || ""),
      username: merged.isGroup ? "Group Chat" : (friend?.username || friend?.name || ""),
      name: chatName,
      userProfilePic: profilePic,
      mock: merged.mock,
      isGroup: !!merged.isGroup,
    });
  };

  return (
    <Flex
      gap={4}
      alignItems="center"
      p="2"
      _hover={{ cursor: "pointer", bg: hoverBg, borderRadius: "md" }}
      bg={isSelected ? selectedBg : "transparent"}
      borderRadius="md"
      position="relative"
    >
      <Flex flex={1} onClick={handleClick} alignItems="center" gap={4}>
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
            {/* Seen icon (only if current user is the sender) */}
            {lastMessage && currentUser?._id && (currentUser._id === (lastMessage.sender || lastMessage.senderId)) && (
              <BsCheckAll size={16} color={lastMessage.seen ? "blue.400" : undefined} />
            )}

            {/* Text preview / image badge */}
            {lastMessage?.text
              ? (
                <Box as="span">
                  {(lastMessage.text.length > 30 ? `${lastMessage.text.substring(0, 30)}...` : lastMessage.text)}
                </Box>
              )
              : (Array.isArray(lastMessage?.attachments) && lastMessage.attachments.length > 0)
                ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <BsImage size={16} />
                    <Text as="span">Image</Text>
                  </Box>
                )
                : <Box as="span" color="gray.400">No messages yet</Box>
            }
          </Text>
        </Stack>
      </Flex>

      {/* Optional action menu (only render if onDelete is provided) */}
      {typeof onDelete === "function" && (
        <Menu>
          <MenuButton as={IconButton} icon={<CiMenuKebab />} variant="ghost" size="sm" _hover={{ bg: "transparent" }} />
          <MenuList bg={menuBg}>
            <MenuItem onClick={onDelete}>Delete</MenuItem>
          </MenuList>
        </Menu>
      )}
    </Flex>
  );
};

export default Conversation;
