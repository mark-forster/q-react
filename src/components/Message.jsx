// Message.jsx — FINAL VERSION (Telegram Avatar Fallback + Correct Call Direction + UI)

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
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from "@chakra-ui/react";

import { BsCheckAll } from "react-icons/bs";
import { CiMenuKebab } from "react-icons/ci";
import { FaEdit, FaForward, FaTrash, FaReply } from "react-icons/fa";

import moment from "moment";
import { useDisclosure } from "@chakra-ui/react";

import AttachmentDisplay from "./AttachmentDisplay";

import { useRecoilValue, useSetRecoilState } from "recoil";
import {
  selectedConversationAtom,
  editingMessageAtom,
  conversationsAtom,
} from "../atoms/messageAtom";
import userAtom from "../atoms/userAtom";

import useDeleteMessage from "../hooks/useDeleteMessage";
import ForwardMessageModal from "./ForwardMessageModal";
import { useSocket } from "../context/SocketContext";

// ⭐ Import the avatar helper functions
import { getInitials, getAvatarColor } from "../utils/avatarHelpers";

// Allowed reactions
const REACTIONS = ["👍", "❤️", "😂", "😡"];

// ================= DELETE MODAL =================
const DeleteMessageModal = ({ isOpen, onClose, onDelete, loading, ownMessage }) => (
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
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

// Reaction bar popup
const ReactionBar = ({ onReact, alignRight }) => (
  <Flex
    bg="white"
    p={1}
    borderRadius="full"
    boxShadow="md"
    gap={2}
    position="absolute"
    top="-32px"
    right={alignRight ? 0 : "auto"}
    left={alignRight ? "auto" : 0}
    zIndex={10}
  >
    {REACTIONS.map((e) => (
      <Box
        key={e}
        cursor="pointer"
        fontSize="20px"
        _hover={{ transform: "scale(1.1)" }}
        onClick={() => onReact(e)}
      >
        {e}
      </Box>
    ))}
  </Flex>
);

const Message = ({ ownMessage, message }) => {
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const user = useRecoilValue(userAtom);
  const conversations = useRecoilValue(conversationsAtom);

  const { deleteMessage, loading } = useDeleteMessage();
  const setEditingMessage = useSetRecoilState(editingMessageAtom);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [showReactions, setShowReactions] = useState(false);

  const { socket } = useSocket();

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

  const ownMessageBg = useColorModeValue("blue.500", "blue.500");
  const otherBg = useColorModeValue("gray.300", "gray.600");
  const otherText = useColorModeValue("black", "white");
  const timeColor = useColorModeValue("gray.500", "gray.400");

  const hasText = Boolean((message?.text || "").trim());
  const hasAttachments = Array.isArray(message?.attachments) && message.attachments.length > 0;
  const replyTo = message?.replyTo;

  const isCallMessage = message?.messageType === "call" || Boolean(message?.callInfo);

  // Render call message bubble
  const renderCallMessage = () => {
    if (!message?.callInfo) return null;

    const info = message.callInfo;

    const isOutgoing = message.sender === user._id;
    const icon = info.callType === "audio" ? "📞" : "📹";
    const callWord = info.callType === "audio" ? "call" : "video call";
    const direction = isOutgoing ? "Outgoing" : "Incoming";

    let label = `${direction} ${callWord}`;

    switch (info.status) {
      case "completed": {
        const sec = info.duration || 0;
        const min = Math.floor(sec / 60);
        const rem = sec % 60;
        const dur = min > 0 ? `${min}m ${rem}s` : `${rem || 0}s`;
        label = `${label} (${dur})`;
        break;
      }
      case "missed":
        label = `Missed ${callWord}`;
        break;
      case "declined":
        label = `${direction} ${callWord} declined`;
        break;
      case "canceled":
        label = `${direction} ${callWord} canceled`;
        break;
      case "timeout":
        label = `Call timeout`;
        break;
      default:
        break;
    }

    return (
      <Flex
        bg={ownMessage ? ownMessageBg : otherBg}
        color={ownMessage ? "white" : otherText}
        px={3}
        py={2}
        borderRadius="md"
        maxW="70vw"
        alignItems="center"
        gap={2}
      >
        <Text fontSize="lg">{icon}</Text>
        <Text fontSize="sm" fontWeight="500">{label}</Text>
      </Flex>
    );
  };

  if (!hasText && !hasAttachments && !isCallMessage) return null;

  const handleEdit = () => setEditingMessage(message);
  const handleReply = () => setEditingMessage({ replyTo: message });
  const handleForward = () => {
    setMessageToForward(message);
    onForwardModalOpen();
  };
  const handleDelete = () => onDeleteModalOpen();

  const handleReaction = (emoji) => {
    socket.emit("reactMessage", {
      messageId: message._id,
      emoji,
      userId: user._id,
      conversationId: selectedConversation._id,
    });
    setShowReactions(false);
  };

  const renderMenu = () => (
    <VStack spacing={2} align="flex-start">
      {ownMessage && hasText && (
        <Button
          size="sm"
          leftIcon={<FaEdit />}
          variant="ghost"
          onClick={handleEdit}
        >
          Edit
        </Button>
      )}

      <Button size="sm" leftIcon={<FaReply />} variant="ghost" onClick={handleReply}>
        Reply
      </Button>

      <Button size="sm" leftIcon={<FaForward />} variant="ghost" onClick={handleForward}>
        Forward
      </Button>

      <Button
        size="sm"
        variant="ghost"
        leftIcon={<span>😀</span>}
        onClick={() => setShowReactions((v) => !v)}
      >
        React
      </Button>

      <Button
        size="sm"
        leftIcon={<FaTrash />}
        variant="ghost"
        colorScheme="red"
        onClick={handleDelete}
      >
        Delete
      </Button>
    </VStack>
  );

  const Bubble = ({ children, align }) => (
    <Flex direction="column" alignSelf={align} position="relative">
      {children}
    </Flex>
  );

  const renderReactions = () => {
    if (!Array.isArray(message.reactions) || message.reactions.length === 0)
      return null;

    const count = {};

    message.reactions.forEach((r) => {
      count[r.emoji] = (count[r.emoji] || 0) + 1;
    });

    return (
      <Flex mt={1} gap={1}>
        {Object.entries(count).map(([emoji, qty]) => (
          <Flex
            key={emoji}
            bg="gray.200"
            px={2}
            py={1}
            borderRadius="full"
            fontSize="12px"
            align="center"
          >
            <Text>{emoji}</Text>
            {qty > 1 && (
              <Text ml={1} fontSize="10px">
                {qty}
              </Text>
            )}
          </Flex>
        ))}
      </Flex>
    );
  };

  // ============================
  //        RENDER UI
  // ============================
  return (
    <>
      {/* ======================== */}
      {/*      SENDER SIDE         */}
      {/* ======================== */}
      {ownMessage ? (
        <Flex gap={2} alignSelf="flex-end" alignItems="flex-end">
          <Popover placement="top-end">
            <PopoverTrigger>
              <IconButton
                icon={<CiMenuKebab />}
                aria-label="menu"
                size="xs"
                variant="ghost"
                mt="-13px"
              />
            </PopoverTrigger>
            <PopoverContent w="auto">
              <PopoverBody p={2}>{renderMenu()}</PopoverBody>
            </PopoverContent>
          </Popover>

          <Bubble align="flex-end">
            {showReactions && (
              <ReactionBar onReact={handleReaction} alignRight />
            )}

            {replyTo && (
              <Box
                bg="blackAlpha.200"
                borderLeft="3px solid #888"
                p={2}
                mb={2}
                borderRadius="md"
              >
                <Text fontSize="xs" fontWeight="bold">
                  {replyTo?.sender?.name}
                </Text>
                <Text fontSize="xs">
                  {replyTo?.text || "Attachment"}
                </Text>
              </Box>
            )}

            {isCallMessage && renderCallMessage()}

            {hasText && (
              <Flex bg={ownMessageBg} p={2} borderRadius="md" maxW="70vw">
                <Text color="white" whiteSpace="pre-wrap">
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
                  isSender={true}
                />
              ))}

            {renderReactions()}

            <Flex mt={1} justifyContent="flex-end" gap={1}>
              <Text fontSize="xs" color={timeColor}>
                {moment(message.updatedAt || message.createdAt).format("h:mm A")}
              </Text>

              {message.updatedAt !== message.createdAt && (
                <Text fontSize="10px" color="gray.400">edited</Text>
              )}

              <BsCheckAll size={16} color="cyan" />
            </Flex>
          </Bubble>

          {/* ⭐ Sender Avatar Fallback */}
          {user?.profilePic?.url ? (
            <Avatar src={user.profilePic.url} w={8} h={8} />
          ) : (
            <Flex
              w="32px"
              h="32px"
              borderRadius="full"
              align="center"
              justify="center"
              bg={getAvatarColor(user?.name || user?.username)}
              color="white"
              fontWeight="bold"
            >
              {getInitials(user?.name, user?.username)}
            </Flex>
          )}
        </Flex>
      ) : (
        /* ======================== */
        /*      RECEIVER SIDE       */
        /* ======================== */
        <Flex gap={2} alignSelf="flex-start" alignItems="flex-end">
          {/* ⭐ Receiver Avatar Fallback */}
          {message?.sender?.profilePic?.url ? (
            <Avatar
              src={message.sender.profilePic.url}
              name={message.sender.name}
              w={8}
              h={8}
            />
          ) : (
            <Flex
              w="32px"
              h="32px"
              borderRadius="full"
              align="center"
              justify="center"
              bg={getAvatarColor(message.sender?.name || message.sender?.username)}
              color="white"
              fontWeight="bold"
            >
              {getInitials(message.sender?.name, message.sender?.username)}
            </Flex>
          )}

          <Bubble align="flex-start">
            {showReactions && <ReactionBar onReact={handleReaction} />}

            {replyTo && (
              <Box
                bg="blackAlpha.200"
                borderLeft="3px solid #888"
                p={2}
                mb={2}
                borderRadius="md"
              >
                <Text fontSize="xs" fontWeight="bold">
                  {replyTo?.sender?.name}
                </Text>
                <Text fontSize="xs">
                  {replyTo?.text || "Attachment"}
                </Text>
              </Box>
            )}

            {isCallMessage && renderCallMessage()}

            {hasText && (
              <Flex bg={otherBg} p={2} borderRadius="md" maxW="70vw">
                <Text whiteSpace="pre-wrap" color={otherText}>
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
                  isSender={false}
                />
              ))}

            {renderReactions()}

            <Text fontSize="xs" color={timeColor} mt={1}>
              {moment(message.updatedAt || message.createdAt).format("h:mm A")}
            </Text>
          </Bubble>

          <Popover placement="top-start">
            <PopoverTrigger>
              <IconButton
                icon={<CiMenuKebab />}
                aria-label="menu"
                size="xs"
                variant="ghost"
                mt="-13px"
              />
            </PopoverTrigger>
            <PopoverContent w="auto">
              <PopoverBody p={2}>{renderMenu()}</PopoverBody>
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
