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
} from "@chakra-ui/react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  IconButton,
} from "@chakra-ui/react";
import { SearchIcon, ChevronLeftIcon } from "@chakra-ui/icons";
import axios from "axios";
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

// Create an axios instance here to use VITE_API_URL consistently.
const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

// A component to display different types of attachments
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

const Message = ({ ownMessage, message }) => {
  // Move all Hooks to the top of the component
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const user = useRecoilValue(userAtom);
  const [imgLoaded, setImgLoaded] = useState(false);
  const { deleteMessage, loading } = useDeleteMessage();
  // Forward states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const conversations = useRecoilValue(conversationsAtom); // <-- Get All Conversations for forward Message
  const [filteredUsers, setFilteredUsers] = useState([]); // <-- Filter Users Array State
  const setEditingMessage = useSetRecoilState(editingMessageAtom);
  const ownMessageBgColor = useColorModeValue("blue.500", "blue.500");
  const otherMessageBgColor = useColorModeValue("gray.300", "gray.600");
  const otherMessageTextColor = useColorModeValue("black", "white");
  const timestampColor = useColorModeValue("gray.500", "gray.400");
  const menuIconColor = useColorModeValue("gray.600", "gray.300");

  useEffect(() => {
    // conversations 
    // conditional check 
    const allConversations = conversations || [];
    
    // If not Search term Show Conversation Users
    if (searchQuery.trim() === "") {
      const convParticipants = allConversations.map(
        (conv) => conv.participants[0]
      );
      setFilteredUsers(convParticipants);
    } else {
      //If Search term show filtered users
      const searchResults = allConversations
        .filter((conv) => {
          const participant = conv.participants[0];
          // participant  false  filter 
          if (!participant) return false;

          return (
            participant.name
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            participant.username
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
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

  // hide empty (safety) - Now correctly placed after all hooks
  if (!message.text && !message.img && (!message.attachments || message.attachments.length === 0)) return null;

  const handleEdit = () => {
    setEditingMessage(message);
  };
  const handleForward = () => {
    setMessageToForward(message);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setMessageToForward(null);
    setSearchQuery("");
    setSelectedUsers([]);
  };

  const handleDelete = async () => {
    if (loading) return;
    await deleteMessage(message._id);
  };

  const handleSend = async () => {
    try {
      // Using axios.post for a POST request
      const response = await api.post(
        `/messages/message/forward/${messageToForward._id}`,
        {
          recipientIds: selectedUsers, // A list of recipient user IDs
        }
      ); // Axios automatically parses the JSON response
      console.log("Messages forwarded successfully:", response.data.message); // Close the modal on successful send
      handleCloseModal();
    } catch (error) {
      // Axios provides more detailed error handling
      console.error(
        "Error forwarding message:",
        error.response?.data?.error || error.message
      ); // You can use a toast or other UI element to show the error to the user
    }
  };

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
                <Flex
                  bg={ownMessageBgColor}
                  p={2}
                  borderRadius={"md"}
                  alignItems="center"
                >
                  <Text
                    color={"white"}
                    wordBreak="break-word"
                    whiteSpace="pre-wrap"
                  >
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
                <Box
                  ml={1}
                  color={message.seen ? "cyan.400" : "gray.300"}
                  fontWeight={"bold"}
                >
                  <BsCheckAll size={16} />
                </Box>
              </Flex>
            </Flex>
          </Flex>
          <Avatar src={user.profilePic.url} w={8} h={8} />
        </Flex>
      ) : (
        <Flex gap={2} alignSelf="flex-start" alignItems="flex-end">
          <Avatar
            src={
              selectedConversation.userProfilePic?.url ||
              selectedConversation.userProfilePic.url
            }
            w={8}
            h={8}
          />
          <Flex gap={1} alignItems="center">
            <Flex direction="column" alignItems="flex-start">
              {message.text && (
                <Flex
                  bg={otherMessageBgColor}
                  p={2}
                  borderRadius={"md"}
                  alignItems="center"
                >
                  <Text
                    color={otherMessageTextColor}
                    wordBreak="break-word"
                    whiteSpace="pre-wrap"
                  >
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

      <Flex>
        <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
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
                             <AttachmentDisplay key={index} attachment={attachment} imgLoaded={imgLoaded} setImgLoaded={setImgLoaded} />
                        ))
                    )}
                </Box>
              </Box>

              <InputGroup mb={4}>
                <InputLeftElement
                  pointerEvents="none"
                  children={<SearchIcon color="gray.300" />}
                />
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
                      // onClick={() => handleUserSelect(user._id)}
                      bg={
                        selectedUsers.includes(user._id)
                          ? useColorModeValue("blue.50", "blue.900")
                          : "transparent"
                      }
                    >
                      <Checkbox
                        isChecked={selectedUsers.includes(user._id)}
                        onChange={() => handleUserSelect(user._id)}
                        colorScheme="blue"
                      />
                      <Avatar
                        src={user.profilePic.url}
                        name={user.name}
                        size="sm"
                      />
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
              <Button variant="ghost" onClick={handleCloseModal}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Flex>
    </>
  );
};

export default Message;
