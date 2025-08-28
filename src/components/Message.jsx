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
  Image,
} from "@chakra-ui/react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from "@chakra-ui/react";
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
import toast from "react-hot-toast";
import { useDisclosure } from '@chakra-ui/react';
import ForwardMessageModal from "./ForwardMessageModal";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});



const DeleteMessageModal = ({ isOpen, onClose, onDelete, loading, ownMessage }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Delete Message</ModalHeader>
        <ModalBody>
          <Text mb={4}>
            {ownMessage ? (
              "Would you like to delete this message for everyone or just for yourself?"
            ) : (
              "Would you like to delete this message just for yourself?"
            )}
          </Text>
          <VStack spacing={4}>
            {ownMessage && (
              <Button
                w="100%"
                colorScheme="red"
                onClick={() => onDelete(true)}
                isLoading={loading}
              >
                Delete for Everyone
              </Button>
            )}
            <Button
              w="100%"
              variant="outline"
              onClick={() => onDelete(false)}
              isLoading={loading}
              colorScheme={!ownMessage ? "red" : "gray"}
            >
              Delete for Me
            </Button>
          </VStack>
        </ModalBody>
        <ModalFooter>
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
  const { isOpen: isForwardModalOpen, onOpen: onForwardModalOpen, onClose: onForwardModalClose } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose } = useDisclosure();
  const [messageToForward, setMessageToForward] = useState(null);

  const ownMessageBgColor = useColorModeValue("blue.500", "blue.500");
  const otherMessageBgColor = useColorModeValue("gray.300", "gray.600");
  const otherMessageTextColor = useColorModeValue("black", "white");
  const timestampColor = useColorModeValue("gray.500", "gray.400");
  const menuIconColor = useColorModeValue("gray.600", "gray.300");

  const hasText = Boolean((message?.text || "").trim());
  const hasAttachments =
    Array.isArray(message?.attachments) && message.attachments.length > 0;

  if (!hasText && !hasAttachments && !message?.img) {
    return null;
  }

  const handleEdit = () => setEditingMessage(message);
  const handleForward = () => {
    setMessageToForward(message);
    onForwardModalOpen();
  };

  const handleDelete = () => {
    onDeleteModalOpen();
  };

  const handleFinalDelete = async (deleteForEveryone) => {
    if (loading) return;
    await deleteMessage(message._id, deleteForEveryone);
    onDeleteModalClose();
  };

  const renderMenuIcons = () => {
    return (
      <HStack spacing={2}>
        {ownMessage && hasText && (
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
  };

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
                <PopoverBody p={2}>{renderMenuIcons()}</PopoverBody>
              </PopoverContent>
            </Popover>
            <Bubble align="flex-end">
              {message.isForwarded && (
                <Text fontSize="xs" color={timestampColor} fontStyle="italic">
                  Forwarded
                </Text>
              )}
              {hasText && (
                <Flex
                  bg={ownMessageBgColor}
                  p={2}
                  borderRadius="md"
                  alignItems="center"
                  maxW="70vw"
                >
                  <Text
                    color="white"
                    wordBreak="break-word"
                    whiteSpace="pre-wrap"
                  >
                    {message.text}
                  </Text>
                </Flex>
              )}
              {hasAttachments &&
                message.attachments.map((att, idx) => (
                  <AttachmentDisplay
                    key={idx}
                    attachment={att}
                    imgLoaded={imgLoaded}
                    setImgLoaded={setImgLoaded}
                    messageId={message._id}
                  />
                ))}
              <Flex
                mt={1}
                alignItems="center"
                justifyContent="flex-end"
                w="100%"
              >
                <Text fontSize="xs" color={timestampColor} mr={1}>
                  {moment(message?.updatedAt || message?.createdAt).format(
                    "h:mm A"
                  )}
                </Text>
                <Box
                  color={
                    Array.isArray(message?.seenBy) &&
                    message.seenBy.length > 1
                      ? "cyan.400"
                      : "gray.300"
                  }
                  fontWeight="bold"
                >
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
              {message.isForwarded && (
                <Text fontSize="xs" color={timestampColor} fontStyle="italic">
                  Forwarded
                </Text>
              )}
              {hasText && (
                <Flex
                  bg={otherMessageBgColor}
                  p={2}
                  borderRadius="md"
                  alignItems="center"
                  maxW="70vw"
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
              {hasAttachments &&
                message.attachments.map((att, idx) => (
                  <AttachmentDisplay
                    key={idx}
                    attachment={att}
                    imgLoaded={imgLoaded}
                    setImgLoaded={setImgLoaded}
                    messageId={message._id}
                  />
                ))}
              <Flex
                mt={1}
                alignItems="center"
                justifyContent="flex-start"
                w="100%"
              >
                <Text fontSize="xs" color={timestampColor}>
                  {moment(message?.updatedAt || message?.createdAt).format(
                    "h:mm A"
                  )}
                </Text>
              </Flex>
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
                <PopoverBody p={2}>{renderMenuIcons()}</PopoverBody>
              </PopoverContent>
            </Popover>
          </Flex>
        </Flex>
      )}

      {messageToForward && (
        <ForwardMessageModal
          isOpen={isForwardModalOpen}
          onClose={() => {
            onForwardModalClose();
            setMessageToForward(null);
          }}
          messageToForward={messageToForward}
          conversations={conversations}
        />
      )}
      <DeleteMessageModal
        isOpen={isDeleteModalOpen}
        onClose={onDeleteModalClose}
        messageId={message._id}
        onDelete={handleFinalDelete}
        loading={loading}
        ownMessage={ownMessage}
      />
    </>
  );
};

export default Message;
