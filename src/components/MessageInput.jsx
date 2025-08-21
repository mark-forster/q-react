import React, { useState, useRef, useEffect } from 'react';
import {
  Flex,
  Image,
  Input,
  InputGroup,
  InputRightElement,
  Spinner,
  IconButton,
  useColorModeValue,
  HStack,
  Text,
  Grid,
} from "@chakra-ui/react";
import { IoSendSharp } from "react-icons/io5";
import { BsEmojiSmile, BsCheckLg } from "react-icons/bs";
import { FaPaperclip, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  selectedConversationAtom,
  conversationsAtom,
  editingMessageAtom,
} from '../atoms/messageAtom';
import { useRecoilState, useSetRecoilState, useRecoilValue } from 'recoil';
import userAtom from '../atoms/userAtom';

// API
const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

const MessageInput = ({ setMessages }) => {
  const [messageText, setMessageText] = useState("");
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const setConversations = useSetRecoilState(conversationsAtom);
  const user = useRecoilValue(userAtom);
  const [editingMessage, setEditingMessage] = useRecoilState(editingMessageAtom);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  const inputBg = useColorModeValue("white", "gray.600");
  const buttonBg = useColorModeValue("blue.500", "blue.400");
  const buttonHoverBg = useColorModeValue("blue.600", "blue.500");

  useEffect(() => {
    if (editingMessage) {
      setMessageText(editingMessage.text);
      if (inputRef.current) inputRef.current.focus();
    } else {
      setMessageText("");
    }
  }, [editingMessage]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    const previews = files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null));
    setFilePreviews(previews);
  };

  const removeFile = (idx) => {
    const nf = selectedFiles.filter((_, i) => i !== idx);
    const np = filePreviews.filter((_, i) => i !== idx);
    setSelectedFiles(nf);
    setFilePreviews(np);
    if (nf.length === 0 && fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isSending) return;
    setIsSending(true);

    // EDIT existing text message
    if (editingMessage) {
      if (messageText.trim() === editingMessage.text) {
        setIsSending(false);
        setEditingMessage(null);
        setMessageText("");
        return;
      }
      try {
        const res = await api.put(`/messages/update/${editingMessage._id}`, { newText: messageText });
        const updated = res.data.data;

        setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));

        setConversations((prevConvs) =>
          prevConvs.map((conv) =>
            conv._id === updated.conversationId
              ? {
                  ...conv,
                  lastMessage: {
                    ...(conv.lastMessage || {}),
                    text: updated.text,
                    sender: updated.sender,
                    updatedAt: updated.updatedAt || updated.createdAt,
                  },
                }
              : conv
          )
        );

        toast.success("Message updated!");
        setEditingMessage(null);
      } catch (err) {
        console.error("Failed to update message:", err);
        toast.error("Failed to update message.");
      } finally {
        setIsSending(false);
        setMessageText("");
      }
      return;
    }

    // CREATE new message
    const isMessageEmpty = !messageText.trim();
    const areFilesEmpty = selectedFiles.length === 0;
    if (isMessageEmpty && areFilesEmpty) {
      toast.error("Message or file cannot be empty");
      setIsSending(false);
      return;
    }
    if (!selectedConversation) {
      toast.error("Please select a conversation first.");
      setIsSending(false);
      return;
    }

    try {
      const formData = new FormData();
      if (messageText) formData.append("message", messageText);
      formData.append("recipientId", selectedConversation.userId);
      formData.append("conversationId", selectedConversation._id);
      selectedFiles.forEach((file) => formData.append("files", file));

      const res = await api.post("/messages", formData);
      const newMessage = res.data.data;
      const newConversationId = newMessage.conversationId;

      setMessages((prev) => [...prev, newMessage]);

      setMessageText("");
      setSelectedFiles([]);
      setFilePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = null;

      setConversations((prevConvs) => {
        let found = false;

        const updated = prevConvs.map((c) => {
          if (c._id === newConversationId) {
            found = true;
            return {
              ...c,
              lastMessage: {
                text: newMessage.text || (newMessage.attachments?.length ? "Attachment" : ""),
                sender: newMessage.sender,
                updatedAt: newMessage.updatedAt || newMessage.createdAt,
              },
            };
          }
          return c;
        });

        if (!found && selectedConversation.mock) {
          // Promote mock → real with valid participants so it stays visible in the list
          const promoted = {
            _id: newConversationId,
            mock: false,
            isGroup: false,
            participants: [
              {
                _id: selectedConversation.userId,
                username: selectedConversation.username,
                name: selectedConversation.name,
                profilePic: selectedConversation.userProfilePic,
              },
              // Optional: include current user if your API normally returns both
              // { _id: user._id, username: user.username, name: user.name, profilePic: user.profilePic }
            ],
            lastMessage: {
              text: newMessage.text || (newMessage.attachments?.length ? "Attachment" : (newMessage.img ? "Image" : "")),
              sender: newMessage.sender,
              updatedAt: newMessage.updatedAt || newMessage.createdAt,
            },
          };
          return [promoted, ...prevConvs.filter((c) => c._id !== selectedConversation._id)];
        }

        if (found) {
          const top = updated.find((c) => c._id === newConversationId);
          const rest = updated.filter((c) => c._id !== newConversationId);
          return [top, ...rest];
        }

        return updated;
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelEdit = () => setEditingMessage(null);

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <>
      {editingMessage && (
        <HStack
          w="full"
          bg={useColorModeValue("gray.100", "gray.700")}
          p={2}
          borderRadius="md"
          mb={2}
        >
          <Text fontSize="sm" color={useColorModeValue("gray.700", "gray.300")}>
            Editing:{" "}
            {editingMessage.text.length > 50
              ? editingMessage.text.substring(0, 50) + "..."
              : editingMessage.text}
          </Text>
          <IconButton
            icon={<FaTimes />}
            aria-label="Cancel edit"
            size="xs"
            onClick={handleCancelEdit}
          />
        </HStack>
      )}

      {filePreviews.length > 0 && (
        <Grid
          templateColumns="repeat(auto-fill, minmax(100px, 1fr))"
          gap={2}
          mt={4}
          p={2}
          bg={useColorModeValue("gray.50", "gray.800")}
          borderRadius="md"
          border="1px solid"
          borderColor={useColorModeValue("gray.200", "gray.700")}
        >
          {filePreviews.map((url, i) => (
            <Flex key={i} position="relative" w="full" h="100px" overflow="hidden" borderRadius="md">
              {url && (
                <Image src={url} alt={`preview-${i}`} objectFit="cover" w="full" h="full" />
              )}
              <IconButton
                icon={<FaTimes />}
                onClick={() => removeFile(i)}
                position="absolute"
                top={1}
                right={1}
                size="xs"
                colorScheme="red"
                aria-label="Remove image"
                isRound
              />
            </Flex>
          ))}
        </Grid>
      )}

      <form onSubmit={handleSendMessage}>
        <Flex
          alignItems={"center"}
          p={0}
          bg={useColorModeValue("white", "gray.700")}
          borderRadius="full"
          boxShadow="xl"
          mt={4}
          gap={2}
          border="1px solid"
          borderColor={useColorModeValue("gray.200", "gray.600")}
        >
          <IconButton
            onClick={() => {}}
            aria-label="Add emoji"
            icon={<BsEmojiSmile />}
            bg="transparent"
            size="lg"
            color={useColorModeValue("gray.600", "gray.300")}
            _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}
          />

          <InputGroup flex={1}>
            <Input
              placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleInputKeyDown}
              bg="transparent"
              border="none"
              _focus={{ border: "none", boxShadow: "none" }}
              py={2}
              size="lg"
              isDisabled={isSending}
              ref={inputRef}
            />
            <InputRightElement height="100%" right="30px">
              <Flex gap={1} alignItems="center">
                {!editingMessage && (
                  <>
                    <IconButton
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Attach files"
                      icon={<FaPaperclip />}
                      bg="transparent"
                      size="lg"
                      color={useColorModeValue("gray.600", "gray.300")}
                      _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}
                      isDisabled={isSending}
                    />
                    <IconButton
                      type="submit"
                      aria-label="Send message"
                      icon={isSending ? <Spinner size="sm" color="white" /> : <IoSendSharp />}
                      bg={buttonBg}
                      color="white"
                      _hover={{ bg: buttonHoverBg }}
                      isRound
                      size="md"
                      isDisabled={isSending || (!messageText.trim() && selectedFiles.length === 0)}
                      boxShadow="md"
                    />
                  </>
                )}

                {editingMessage && (
                  <IconButton
                    type="submit"
                    aria-label="Update message"
                    icon={isSending ? <Spinner size="sm" color="white" /> : <BsCheckLg />}
                    bg={buttonBg}
                    color="white"
                    _hover={{ bg: buttonHoverBg }}
                    isRound
                    size="md"
                    isDisabled={isSending || !messageText.trim()}
                    boxShadow="md"
                  />
                )}
              </Flex>
            </InputRightElement>
          </InputGroup>

          <Input type="file" multiple hidden ref={fileInputRef} onChange={handleFileChange} />
        </Flex>
      </form>
    </>
  );
};

export default MessageInput;
