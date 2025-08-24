import React, { useState } from "react";
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
  Tooltip,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { Popover, PopoverTrigger, PopoverContent, PopoverBody } from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { BsCheckAll } from "react-icons/bs";
import { CiMenuKebab } from "react-icons/ci";
import { FaEdit, FaForward, FaTrash } from "react-icons/fa";
import { useRecoilValue, useSetRecoilState } from "recoil";
import {
  selectedConversationAtom,
  editingMessageAtom,
  conversationsAtom,
} from "../atoms/messageAtom";
import userAtom from "../atoms/userAtom";
import moment from "moment";
import useDeleteMessage from "../hooks/useDeleteMessage";
import axios from "axios";
import AttachmentDisplay from "./AttachmentDisplay";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

/** Forward modal */
const ForwardMessageModal = ({ isOpen, onClose, messageToForward, conversations }) => {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  const participantsFromConvs = (convs) =>
    (convs || []).map((c) => c?.participants?.[0]).filter(Boolean);

  const filteredUsers = participantsFromConvs(conversations).filter((u) => {
    if (!u) return false;
    const q = searchQuery.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q)
    );
  });

  const toggleUser = (id) =>
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSend = async () => {
    try {
      await api.post(`/messages/message/forward/${messageToForward._id}`, {
        recipientIds: selectedUsers,
      });
      toast({
        title: "Message forwarded.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      console.error("Error forwarding message:", error);
      toast({
        title: "Error forwarding message.",
        description: error?.response?.data?.error || "Unknown error",
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
              Message:
            </Text>
            <Box p={2} bg={useColorModeValue("gray.100", "gray.700")} borderRadius="md">
              <Text>{messageToForward?.text}</Text>
              {messageToForward?.attachments?.length > 0 &&
                messageToForward.attachments.map((att, i) => (
                  <AttachmentDisplay key={i} attachment={att} />
                ))}
            </Box>
          </Box>

          <InputGroup mb={3}>
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
              filteredUsers.map((u) => (
                <HStack
                  key={u._id}
                  p={2}
                  borderRadius="md"
                  _hover={{ bg: useColorModeValue("gray.100", "gray.700") }}
                  cursor="pointer"
                  onClick={() => toggleUser(u._id)}
                  bg={
                    selectedUsers.includes(u._id)
                      ? useColorModeValue("blue.50", "blue.900")
                      : "transparent"
                  }
                >
                  <Checkbox
                    isChecked={selectedUsers.includes(u._id)}
                    onChange={() => toggleUser(u._id)}
                    colorScheme="blue"
                  />
                  <Avatar src={u?.profilePic?.url} name={u?.name} size="sm" />
                  <Text>{u?.name}</Text>
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
          <Button colorScheme="blue" mr={3} onClick={handleSend} isDisabled={!selectedUsers.length}>
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
  const conversations = useRecoilValue(conversationsAtom);
  const { deleteMessage, loading } = useDeleteMessage();
  const setEditingMessage = useSetRecoilState(editingMessageAtom);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);

  const ownMessageBgColor = useColorModeValue("blue.500", "blue.500");
  const otherMessageBgColor = useColorModeValue("gray.300", "gray.600");
  const otherMessageTextColor = useColorModeValue("black", "white");
  const timestampColor = useColorModeValue("gray.500", "gray.400");
  const menuIconColor = useColorModeValue("gray.600", "gray.300");

  if (!message?.text && !message?.img && (!message?.attachments || message.attachments.length === 0)) {
    return null;
  }

  const handleEdit = () => setEditingMessage(message);
  const handleForward = () => {
    setMessageToForward(message);
    setIsForwardModalOpen(true);
  };
  const handleDelete = async () => {
    if (loading) return;
    await deleteMessage(message._id);
  };

  const menuIcons = (
    <HStack spacing={2}>
      {ownMessage && !message?.img && (
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

  const Bubble = ({ children, align = "flex-start" }) => (
    <Flex gap={1} alignItems="center" direction="column" alignSelf={align}>
      {children}
    </Flex>
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
            <Bubble align="flex-end">
              {message?.text && (
                <Flex bg={ownMessageBgColor} p={2} borderRadius="md" alignItems="center" maxW="70vw">
                  <Text color="white" wordBreak="break-word" whiteSpace="pre-wrap">
                    {message.text}
                  </Text>
                </Flex>
              )}
              {message?.attachments?.length > 0 &&
                message.attachments.map((att, idx) => (
                  <AttachmentDisplay
                    key={idx}
                    attachment={att}
                    imgLoaded={imgLoaded}
                    setImgLoaded={setImgLoaded}
                    messageId={message._id}
                  />
                ))}
              <Flex mt={1} alignItems="center">
                <Text fontSize="xs" color={timestampColor}>
                  {moment(message?.updatedAt || message?.createdAt).format("h:mm A")}
                </Text>
                <Box ml={1} color={Array.isArray(message?.seenBy) && message.seenBy.length > 1 ? "cyan.400" : "gray.300"} fontWeight="bold">
                  <BsCheckAll size={16} />
                </Box>
              </Flex>
            </Bubble>
          </Flex>
          <Avatar src={user?.profilePic?.url} w={8} h={8} />
        </Flex>
      ) : (
        <Flex gap={2} alignSelf="flex-start" alignItems="flex-end">
          <Avatar src={selectedConversation?.userProfilePic?.url} w={8} h={8} />
          <Flex gap={1} alignItems="center">
            <Bubble align="flex-start">
              {message?.text && (
                <Flex bg={otherMessageBgColor} p={2} borderRadius="md" alignItems="center" maxW="70vw">
                  <Text color={otherMessageTextColor} wordBreak="break-word" whiteSpace="pre-wrap">
                    {message.text}
                  </Text>
                </Flex>
              )}
              {message?.attachments?.length > 0 &&
                message.attachments.map((att, idx) => (
                  <AttachmentDisplay
                    key={idx}
                    attachment={att}
                    imgLoaded={imgLoaded}
                    setImgLoaded={setImgLoaded}
                    messageId={message._id}
                  />
                ))}
              <Text fontSize="xs" color={timestampColor} mt={1}>
                {moment(message?.updatedAt || message?.createdAt).format("h:mm A")}
              </Text>
            </Bubble>
            <Popover placement="top-start">
              <PopoverTrigger>
                <IconButton
                  icon={<CiMenuKebab />}
                  aria-label="Message menu"
                  size="xs"
                  variant="ghost"
                  color={useColorModeValue("gray.600", "gray.300")}
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

      {messageToForward && (
        <ForwardMessageModal
          isOpen={isForwardModalOpen}
          onClose={() => {
            setIsForwardModalOpen(false);
            setMessageToForward(null);
          }}
          messageToForward={messageToForward}
          conversations={conversations}
        />
      )}
    </>
  );
};
 
export default Message;