// Message.jsx
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
  HStack,
  useColorModeValue,
  Tooltip,
  IconButton,
} from "@chakra-ui/react";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from "@chakra-ui/react";

import { BsCheckAll } from "react-icons/bs";
import { CiMenuKebab } from "react-icons/ci";
import { FaEdit, FaForward, FaTrash } from "react-icons/fa";

import moment from "moment";
import AttachmentDisplay from "./AttachmentDisplay";
import { useDisclosure } from "@chakra-ui/react";

import { useRecoilValue, useSetRecoilState } from "recoil";
import {
  selectedConversationAtom,
  editingMessageAtom,
  conversationsAtom,
} from "../atoms/messageAtom";
import userAtom from "../atoms/userAtom";
import useDeleteMessage from "../hooks/useDeleteMessage";

const DeleteMessageModal = ({
  isOpen,
  onClose,
  onDelete,
  loading,
  ownMessage,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Delete Message</ModalHeader>
        <ModalBody>
          <Text mb={4}>
            {ownMessage
              ? "Delete for everyone or only for you?"
              : "Delete this message only for you?"}
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

  const {
    isOpen: isForwardModalOpen,
    onOpen: onForwardModalOpen,
    onClose: onForwardModalClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onClose: onDeleteModalClose,
  } = useDisclosure();

  const [messageToForward, setMessageToForward] = useState(null);

  const ownMessageBg = useColorModeValue("blue.500", "blue.500");
  const otherBg = useColorModeValue("gray.300", "gray.600");
  const otherText = useColorModeValue("black", "white");
  const timeColor = useColorModeValue("gray.500", "gray.400");

  const hasText = Boolean((message?.text || "").trim());
  const hasAttachments =
    Array.isArray(message?.attachments) && message.attachments.length > 0;

  // 🔥 call message flag
  const isCallMessage = Boolean(message?.callInfo);

  // =======================
  //   CALL BUBBLE (Telegram style)
  // =======================
  const renderCallMessage = () => {
    const info = message.callInfo;
    if (!info) return null;

    const isAudio = info.callType === "audio";
    const callIcon = isAudio ? "📞" : "📹";

    const direction = ownMessage ? "Outgoing" : "Incoming";
    const callWord = isAudio ? "call" : "video call";

    let label = "";

    if (info.status === "completed") {
      const mins = Math.floor((info.duration || 0) / 60);
      const secs = (info.duration || 0) % 60;
      const durStr =
        mins > 0 ? `${mins}m ${secs}s` : `${secs || 0} seconds`;
      label = `${direction} ${callWord} (${durStr})`;
    } else if (info.status === "missed") {
      label = `Missed ${callWord}`;
    } else if (info.status === "declined") {
      label = `Declined ${callWord}`;
    } else if (info.status === "canceled") {
      label = `Canceled ${callWord}`;
    } else {
      // fallback
      label = `${direction} ${callWord}`;
    }

    return (
      <Flex
        bg={ownMessage ? "blue.500" : "gray.400"}
        color={ownMessage ? "white" : "black"}
        px={3}
        py={2}
        borderRadius="md"
        maxW="70%"
        alignItems="center"
        gap={2}
      >
        <Text fontSize="lg">{callIcon}</Text>
        <Text fontSize="sm" fontWeight="500">
          {label}
        </Text>
      </Flex>
    );
  };

  // မည်သည့် content မရှိရင် (text/attach/call) → render မလုပ်
  if (!hasText && !hasAttachments && !isCallMessage) return null;

  const handleEdit = () => setEditingMessage(message);
  const handleForward = () => {
    setMessageToForward(message);
    onForwardModalOpen();
  };
  const handleDelete = () => onDeleteModalOpen();

  const renderMenuIcons = () => (
    <HStack spacing={2}>
      {ownMessage && hasText && (
        <Tooltip label="Edit" hasArrow>
          <IconButton
            icon={<FaEdit />}
            aria-label="Edit"
            size="sm"
            variant="ghost"
            onClick={handleEdit}
          />
        </Tooltip>
      )}

      <Tooltip label="Forward" hasArrow>
        <IconButton
          icon={<FaForward />}
          aria-label="Forward"
          size="sm"
          variant="ghost"
          onClick={handleForward}
        />
      </Tooltip>

      <Tooltip label="Delete" hasArrow>
        <IconButton
          icon={<FaTrash />}
          aria-label="Delete"
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          isDisabled={loading}
        />
      </Tooltip>
    </HStack>
  );

  const Bubble = ({ children, align = "flex-start" }) => (
    <Flex direction="column" alignSelf={align}>
      {children}
    </Flex>
  );

  return (
    <>
      {ownMessage ? (
        <Flex gap={2} alignSelf="flex-end" alignItems="flex-end">
          <Popover placement="top-end">
            <PopoverTrigger>
              <IconButton
                icon={<CiMenuKebab />}
                aria-label="menu"
                size="xs"
                variant="ghost"
                mt="-16px"
              />
            </PopoverTrigger>
            <PopoverContent w="auto">
              <PopoverBody p={2}>{renderMenuIcons()}</PopoverBody>
            </PopoverContent>
          </Popover>

          <Bubble align="flex-end">
            {/* CALL MESSAGE */}
            {isCallMessage && renderCallMessage()}

            {/* NORMAL TEXT (call message တွေအတွက် backend က text="" ထားလို့ မထွက်တော့) */}
            {hasText && (
              <Flex bg={ownMessageBg} p={2} borderRadius="md" maxW="70vw">
                <Text color="white" whiteSpace="pre-wrap">
                  {message.text}
                </Text>
              </Flex>
            )}

            {/* ATTACHMENTS */}
            {hasAttachments &&
              message.attachments.map((att, idx) => (
                <AttachmentDisplay
                  key={idx}
                  attachment={att}
                  imgLoaded={imgLoaded}
                  setImgLoaded={setImgLoaded}
                  messageId={message._id}
                  isSender={true}
                />
              ))}

            {/* TIME + Seen */}
            <Flex mt={1} justifyContent="flex-end" alignItems="center">
              <Text fontSize="xs" color={timeColor} mr={1}>
                {moment(message.updatedAt || message.createdAt).format(
                  "h:mm A"
                )}
              </Text>

              {Array.isArray(message?.seenBy) &&
              message.seenBy.length > 1 ? (
                <Box color="cyan.400">
                  <BsCheckAll size={16} />
                </Box>
              ) : (
                <Box color="gray.300">
                  <BsCheckAll size={16} />
                </Box>
              )}
            </Flex>
          </Bubble>

          <Avatar src={user?.profilePic?.url} w={8} h={8} />
        </Flex>
      ) : (
        // RECEIVER BUBBLE
        <Flex gap={2} alignSelf="flex-start" alignItems="flex-end">
          <Avatar
            src={selectedConversation?.userProfilePic?.url}
            w={8}
            h={8}
          />

          <Bubble align="flex-start">
            {/* CALL MESSAGE */}
            {isCallMessage && renderCallMessage()}

            {/* NORMAL TEXT */}
            {hasText && (
              <Flex bg={otherBg} p={2} borderRadius="md" maxW="70vw">
                <Text color={otherText} whiteSpace="pre-wrap">
                  {message.text}
                </Text>
              </Flex>
            )}

            {/* ATTACHMENTS */}
            {hasAttachments &&
              message.attachments.map((att, idx) => (
                <AttachmentDisplay
                  key={idx}
                  attachment={att}
                  imgLoaded={imgLoaded}
                  setImgLoaded={setImgLoaded}
                  messageId={message._id}
                  isSender={false}
                />
              ))}

            <Text fontSize="xs" color={timeColor} mt={1}>
              {moment(message.updatedAt || message.createdAt).format(
                "h:mm A"
              )}
            </Text>
          </Bubble>

          <Popover placement="top-start">
            <PopoverTrigger>
              <IconButton
                icon={<CiMenuKebab />}
                aria-label="menu"
                size="xs"
                variant="ghost"
                mt="-16px"
              />
            </PopoverTrigger>
            <PopoverContent w="auto">
              <PopoverBody p={2}>{renderMenuIcons()}</PopoverBody>
            </PopoverContent>
          </Popover>
        </Flex>
      )}

      {/* Forward Modal */}
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

      {/* Delete Modal */}
      <DeleteMessageModal
        isOpen={isDeleteModalOpen}
        onClose={onDeleteModalClose}
        onDelete={async (deleteForEveryone) =>
          await deleteMessage(message._id, deleteForEveryone)
        }
        loading={loading}
        ownMessage={ownMessage}
      />
    </>
  );
};

export default Message;
