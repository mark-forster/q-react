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
import { focusInputAtom } from "../atoms/messageAtom";
import {
  selectedConversationAtom,
  editingMessageAtom,
  conversationsAtom,
} from "../atoms/messageAtom";
import userAtom from "../atoms/userAtom";

import useDeleteMessage from "../hooks/useDeleteMessage";
import ForwardMessageModal from "./ForwardMessageModal";
import { useSocket } from "../context/SocketContext";

import { getInitials, getAvatarColor } from "../utils/avatarHelpers";

// Allowed reactions
const REACTIONS = ["👍", "❤️", "😂", "😡"];

// ================= DELETE MODAL =================
const DeleteMessageModal = ({
  isOpen,
  onClose,
  onDelete,
  loading,
  ownMessage,
}) => (
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
    zIndex={2000}
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

// Reply Preview Text Helper
// ===============================
const MAX_CHARS = 7;

const getReplyPreviewText = (msg) => {
  if (!msg) return "Attachment";

  if (!msg.text && !msg.attachments) {
    return "Attachment Reply";
  }

  // call message
  if (msg.messageType === "call") {
    return "Attachment Reply";
  }

  // attachments
  if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
    return "Attachment";
  }

  // text (CHARACTER based)
  if (msg.text) {
    const text = msg.text.trim();

    if (text.length <= MAX_CHARS) {
      return `Reply ${text}`;
    }

    return `Reply ${text.slice(0, MAX_CHARS)} ......`;
  }

  return "Attachment Reply";
};

const Message = ({ ownMessage, message }) => {
  const setFocusInput = useSetRecoilState(focusInputAtom);

  // ===============================
  // SYSTEM MESSAGE
  // ===============================
  if (message.messageType === "system") {
    return (
      <Flex justify="center" my={2}>
        <Text fontSize="sm" color="gray.500">
          {message.text}
        </Text>
      </Flex>
    );
  }
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

  const ownMessageBg = useColorModeValue("#23ADE3", "#3FB07B;");
  const otherBg = useColorModeValue("#cbcbcb", "#cbcbcb");
const otherText = useColorModeValue("gray.800", "white");
  const timeColor = useColorModeValue("gray.500", "gray.400");

  const isCallMessage =
    message?.messageType === "call" &&
    ["completed", "missed", "timeout", "canceled", "declined"].includes(
      message?.callInfo?.status
    );

  // ===============================
  // Forwarded
  // ===============================
  const renderForwardedLabel = () => {
    if (!message?.isForwarded || !message?.forwardedFrom) return null;

    const name =
      message.forwardedFrom.name || message.forwardedFrom.username || "Unknown";

    return (
      <Text fontSize="xs" color="gray.400" mb={1} fontStyle="italic">
        Forwarded from {name}
      </Text>
    );
  };
  const hasText = !isCallMessage && Boolean((message?.text || "").trim());
  const hasAttachments =
    Array.isArray(message?.attachments) && message.attachments.length > 0;
  const replyTo = message?.replyTo;
  // Render call message bubble
  const renderCallMessage = () => {
    if (!message?.callInfo) return null;

    const info = message.callInfo;

    const isOutgoing =
      String(message.sender?._id || message.sender) === String(user._id);
    const icon = info.callType === "audio" ? "📞" : "📹";
    const callWord = info.callType === "audio" ? "call" : "video call";
    const direction = isOutgoing ? "Outgoing" : "Incoming";

    let label = "Incoming Call";

    if (info.status === "missed" || info.status === "timeout") {
      label = "Missed Call";
    } else if (info.status === "canceled") {
      label = "Canceled Call";
    } else if (info.status === "declined") {
      label = "Declined Call";
    } else if (isOutgoing) {
      label = "Outgoing Call";
    }

    return (
      <Flex
        bg={ownMessage ? ownMessageBg : otherBg}
        color={ownMessage ? "white" : "dark"}
        px={4}
        py={3}
        borderRadius="2xl"
        minW="220px"
        maxW="320px"
        justify="space-between"
        align="center"
      >
        {/* LEFT SIDE */}
        <Flex direction="column" gap={1}>
          <Text fontSize="md" fontWeight="600">
            {label}
          </Text>

          <Flex align="center" gap={1}>
            <Text fontSize="sm" color={isOutgoing ? "green.400" : "red.400"}>
              {isOutgoing ? "↗" : "↙"}
            </Text>

            <Text fontSize="sm" color="gray.400">
              {moment(message.createdAt).format("h:mm A")}
              {info.status === "completed" && info.duration
                ? `, ${info.duration} seconds`
                : ""}
            </Text>
          </Flex>
        </Flex>

        {/* RIGHT ICON */}
        <Text fontSize="xl">{info.callType === "audio" ? "📞" : "📹"}</Text>
      </Flex>
    );
  };

  if (
    !hasText &&
    !hasAttachments &&
    !isCallMessage &&
    !hasReactions &&
    message.messageType !== "system"
  ) {
    return null;
  }

  const handleEdit = () => setEditingMessage(message);
  const handleReply = () => {
    setEditingMessage({ replyTo: message });
    setFocusInput(true);
  };
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

      <Button
        size="sm"
        leftIcon={<FaReply />}
        variant="ghost"
        onClick={handleReply}
      >
        Reply
      </Button>

      <Button
        size="sm"
        leftIcon={<FaForward />}
        variant="ghost"
        onClick={handleForward}
      >
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

    const grouped = {};
    message.reactions.forEach((r) => {
      grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
    });

    return (
      <Flex
        mt={1}
        alignSelf={ownMessage ? "flex-end" : "flex-start"}
        gap={1}
        px={2}
        py="2px"
        bg={useColorModeValue("gray.100", "gray.700")}
        borderRadius="full"
        width="fit-content"
        fontSize="13px"
      >
        {Object.entries(grouped).map(([emoji, count]) => (
          <Flex key={emoji} align="center" gap="2px">
            <Text>{emoji}</Text>
            {count > 1 && (
              <Text fontSize="11px" color="gray.500">
                {count}
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
      {/*      SENDER SIDE         */}
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
            {renderForwardedLabel()}
            {showReactions && (
              <ReactionBar onReact={handleReaction} alignRight />
            )}

            {replyTo && (
              <Box mb={1}>
                <Text fontSize="xs" color="gray.400">
                  {getReplyPreviewText(replyTo)}
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
                {moment(message.updatedAt || message.createdAt).format(
                  "h:mm A"
                )}
              </Text>

              <BsCheckAll size={16} color="cyan" />
            </Flex>
          </Bubble>

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
          {/*  Receiver Avatar Fallback */}
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
              bg={getAvatarColor(
                message.sender?.name || message.sender?.username
              )}
              color="white"
              fontWeight="bold"
            >
              {getInitials(message.sender?.name, message.sender?.username)}
            </Flex>
          )}

          <Bubble align="flex-start">
            {renderForwardedLabel()}
            {showReactions && <ReactionBar onReact={handleReaction} />}

            {replyTo && (
              <Box mb={1}>
                <Text fontSize="xs" color="gray.400">
                  {getReplyPreviewText(replyTo)}
                </Text>
              </Box>
            )}

            {isCallMessage && renderCallMessage()}

            {hasText && (
              <Flex
                bg={ownMessage ? ownMessageBg : otherBg}
                p={2}
                color="black"
                borderRadius="md"
                maxW="70vw"
              >
                <Text color={ownMessage ? "white" : "black"}>
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
