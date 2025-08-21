import React, { useState, useEffect } from "react";
import {
  Flex,
  Box,
  Text,
  Avatar,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  Input,
  InputGroup,
  InputLeftElement,
  HStack,
  useColorModeValue,
  Checkbox,
  Stack,
  Tooltip,
  Image,
  Skeleton,
  useToast, // Added useToast for user feedback
} from "@chakra-ui/react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  IconButton,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { BsCheckAll } from "react-icons/bs";
import { useRecoilValue, useSetRecoilState } from "recoil";
import {
  selectedConversationAtom,
  editingMessageAtom,
  conversationsAtom,
} from "../atoms/messageAtom";
import userAtom from "../atoms/userAtom";
import moment from "moment";
import { CiMenuKebab } from "react-icons/ci";
import { FaEdit, FaForward, FaTrash } from "react-icons/fa";
import useDeleteMessage from "../hooks/useDeleteMessage";
import axios from "axios";

// Create an axios instance here to use VITE_API_URL consistently.
const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

/**
 * A component to display different types of attachments.
 * This is now a self-contained component for better organization.
 */
const AttachmentDisplay = ({ attachment, imgLoaded, setImgLoaded }) => {
  switch (attachment.type) {
    case 'image':
      return (
        <Box mt={1} w={"200px"} position="relative">
          {!imgLoaded && <Skeleton w={"200px"} h={"200px"} />}
          <Image
            src={attachment.url}
            alt="Message image"
            borderRadius={4}
            onLoad={() => setImgLoaded(true)}
            style={{ display: imgLoaded ? "block" : "none" }}
          />
        </Box>
      );
    case 'video':
      return (
        <Box mt={1} w={"200px"} position="relative">
          <video controls src={attachment.url} style={{ width: "100%", borderRadius: "4px" }} />
        </Box>
      );
    case 'audio':
      return (
        <Box mt={1}>
          <audio controls src={attachment.url} style={{ width: "100%" }} />
        </Box>
      );
    case 'file':
      return (
        <Flex alignItems="center" p={2} bg={useColorModeValue("gray.100", "gray.700")} borderRadius="md" mt={1}>
          <Text fontSize="sm" isTruncated maxW={"200px"}>{attachment.name}</Text>
          <a href={attachment.url} target="_blank" rel="noopener noreferrer">
            <Button size="xs" ml={2}>Download</Button>
          </a>
        </Flex>
      );
    default:
      return null;
  }
};

/**
 * A modal component for forwarding messages.
 * This separation makes the Message component cleaner and more focused.
 */
const ForwardMessageModal = ({ isOpen, onClose, messageToForward }) => {
  const toast = useToast();
  const conversations = useRecoilValue(conversationsAtom);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    const allConversations = conversations || [];
    
    if (searchQuery.trim() === "") {
      const convParticipants = allConversations.map((conv) => conv.participants[0]);
      setFilteredUsers(convParticipants);
    } else {
      const searchResults = allConversations
        .filter((conv) => {
          const participant = conv.participants[0];
          if (!participant) return false;
          return (
            participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            participant.username.toLowerCase().includes(searchQuery.toLowerCase())
          );
        })
        .map((conv) => conv.participants[0]);

      setFilteredUsers(searchResults);
    }
  }, [searchQuery, conversations]);

  const handleUserSelect = (userId) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSend = async () => {
    try {
      await api.post(`/messages/message/forward/${messageToForward._id}`, {
        recipientIds: selectedUsers,
      });
      toast({
        title: "Message forwarded.",
        description: "The message has been successfully forwarded.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      console.error("Error forwarding message:", error.response?.data?.error || error.message);
      toast({
        title: "Error forwarding message.",
        description: error.response?.data?.error || "An unknown error occurred.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader>Forward Message</ModalHeader>
        <ModalBody>
          <Box mb={4}>
            <Text mb={2} fontWeight="medium">
              Message to forward:
            </Text>
            <Box
              p={2}
              bg={useColorModeValue("gray.100", "gray.700")}
              borderRadius="md"
            >
              <Text>{messageToForward?.text}</Text>
              {messageToForward?.attachments && messageToForward.attachments.length > 0 && (
                messageToForward.attachments.map((attachment, index) => (
                  <AttachmentDisplay key={index} attachment={attachment} />
                ))
              )}
            </Box>
          </Box>
          <InputGroup mb={4}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          <VStack spacing={2} align="stretch" maxH="40vh" overflowY="auto">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <HStack
                  key={user._id}
                  p={2}
                  borderRadius="md"
                  _hover={{ bg: useColorModeValue("gray.100", "gray.700") }}
                  cursor="pointer"
                  onClick={() => handleUserSelect(user._id)}
                  bg={selectedUsers.includes(user._id) ? useColorModeValue("blue.50", "blue.900") : "transparent"}
                >
                  <Checkbox
                    isChecked={selectedUsers.includes(user._id)}
                    onChange={() => handleUserSelect(user._id)}
                    colorScheme="blue"
                  />
                  <Avatar src={user.profilePic?.url} name={user.name} size="sm" />
                  <Text>{user.name}</Text>
                </HStack>
              ))
            ) : (
              <Text textAlign="center" color="gray.500">
                No users found.
              </Text>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="blue"
            mr={3}
            onClick={handleSend}
            isDisabled={selectedUsers.length === 0}
          >
            Send To ({selectedUsers.length})
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const Message = ({ ownMessage, message }) => {
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const user = useRecoilValue(userAtom);
  const [imgLoaded, setImgLoaded] = useState(false);
  const { deleteMessage, loading } = useDeleteMessage();
  const setEditingMessage = useSetRecoilState(editingMessageAtom);
  
  // State for the forwarding modal
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);

  const ownMessageBgColor = useColorModeValue("blue.500", "blue.500");
  const otherMessageBgColor = useColorModeValue("gray.300", "gray.600");
  const otherMessageTextColor = useColorModeValue("black", "white");
  const timestampColor = useColorModeValue("gray.500", "gray.400");
  const menuIconColor = useColorModeValue("gray.600", "gray.300");

  if (!message.text && !message.img && (!message.attachments || message.attachments.length === 0)) {
    return null;
  }

  const handleEdit = () => {
    setEditingMessage(message);
  };

  const handleForward = () => {
    setMessageToForward(message);
    setIsForwardModalOpen(true);
  };

  const handleCloseForwardModal = () => {
    setIsForwardModalOpen(false);
    setMessageToForward(null);
  };

  const handleDelete = async () => {
    if (loading) return;
    await deleteMessage(message._id);
  };

  // Common JSX for the popover menu icons
  const menuIcons = (
    <HStack spacing={2}>
      {ownMessage && !message.img && (
        <Tooltip label="Edit" hasArrow placement="top" openDelay={150}>
          <IconButton
            icon={<FaEdit />}
            aria-label="Edit message"
            onClick={handleEdit}
            size="sm"
            variant="ghost"
            colorScheme="blue"
          />
        </Tooltip>
      )}
      <Tooltip label="Forward" hasArrow placement="top" openDelay={150}>
        <IconButton
          icon={<FaForward />}
          aria-label="Forward message"
          onClick={handleForward}
          size="sm"
          variant="ghost"
          colorScheme="blue"
        />
      </Tooltip>
      <Tooltip label="Delete" hasArrow placement="top" openDelay={150}>
        <IconButton
          icon={<FaTrash />}
          aria-label="Delete message"
          onClick={handleDelete}
          size="sm"
          variant="ghost"
          colorScheme="red"
          isDisabled={loading}
        />
      </Tooltip>
    </HStack>
  );

  return (
    <>
      {ownMessage ? (
        // Own message display
        <Flex gap={2} alignSelf="flex-end" alignItems="flex-end">
          <Flex gap={1} alignItems="center">
            <Popover placement="top-end">
              <PopoverTrigger>
                <IconButton
                  icon={<CiMenuKebab />}
                  aria-label="Message menu"
                  size="xs"
                  variant="ghost"
                  color={menuIconColor}
                  mt="-16px"
                  marginLeft={"auto"}
                />
              </PopoverTrigger>
              <PopoverContent w="auto" _focus={{ outline: "none" }}>
                <PopoverBody p={2}>{menuIcons}</PopoverBody>
              </PopoverContent>
            </Popover>
            <Flex direction="column" alignItems="flex-end">
              {message.text && (
                <Flex bg={ownMessageBgColor} p={2} borderRadius={"md"} alignItems="center">
                  <Text color={"white"} wordBreak="break-word" whiteSpace="pre-wrap">
                    {message.text}
                  </Text>
                </Flex>
              )}
              {message.attachments && message.attachments.length > 0 && (
                message.attachments.map((attachment, index) => (
                  <AttachmentDisplay key={index} attachment={attachment} imgLoaded={imgLoaded} setImgLoaded={setImgLoaded} />
                ))
              )}
              <Flex mt={1} alignItems="center">
                <Text fontSize="xs" color={timestampColor}>
                  {moment(message.updatedAt).format("h:mm A")}
                </Text>
                <Box ml={1} color={message.seen ? "cyan.400" : "gray.300"} fontWeight={"bold"}>
                  <BsCheckAll size={16} />
                </Box>
              </Flex>
            </Flex>
          </Flex>
          <Avatar src={user.profilePic.url} w={8} h={8} />
        </Flex>
      ) : (
        // Other user's message display
        <Flex gap={2} alignSelf="flex-start" alignItems="flex-end">
          <Avatar src={selectedConversation.userProfilePic?.url || selectedConversation.userProfilePic?.url} w={8} h={8} />
          <Flex gap={1} alignItems="center">
            <Flex direction="column" alignItems="flex-start">
              {message.text && (
                <Flex bg={otherMessageBgColor} p={2} borderRadius={"md"} alignItems="center">
                  <Text color={otherMessageTextColor} wordBreak="break-word" whiteSpace="pre-wrap">
                    {message.text}
                  </Text>
                </Flex>
              )}
              {message.attachments && message.attachments.length > 0 && (
                message.attachments.map((attachment, index) => (
                  <AttachmentDisplay key={index} attachment={attachment} imgLoaded={imgLoaded} setImgLoaded={setImgLoaded} />
                ))
              )}
              <Text fontSize="xs" color={timestampColor} mt={1}>
                {moment(message.updatedAt).format("h:mm A")}
              </Text>
            </Flex>
            <Popover placement="top-start">
              <PopoverTrigger>
                <IconButton
                  icon={<CiMenuKebab />}
                  aria-label="Message menu"
                  size="xs"
                  variant="ghost"
                  color={menuIconColor}
                  mt="-16px"
                />
              </PopoverTrigger>
              <PopoverContent w="auto" _focus={{ outline: "none" }}>
                <PopoverBody p={2}>{menuIcons}</PopoverBody>
              </PopoverContent>
            </Popover>
          </Flex>
        </Flex>
      )}

      {/* The new dedicated forward modal component */}
      {messageToForward && (
        <ForwardMessageModal
          isOpen={isForwardModalOpen}
          onClose={handleCloseForwardModal}
          messageToForward={messageToForward}
        />
      )}
    </>
  );
};

export default Message;
