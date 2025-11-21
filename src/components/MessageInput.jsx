// ===============================
// FIXED MessageInput.jsx
// Duplicate-Free Version
// ===============================

import React, { useState, useRef, useEffect } from "react";
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
  Box,
} from "@chakra-ui/react";

import { IoSendSharp } from "react-icons/io5";
import { BsEmojiSmile } from "react-icons/bs";
import { FaPaperclip, FaTimes, FaMicrophone, FaStopCircle } from "react-icons/fa";
import { FaRegFileAlt, FaFilePdf, FaFileWord, FaFileExcel } from "react-icons/fa";
import { FaFileVideo, FaFileAudio } from "react-icons/fa6";
import { IoIosPlayCircle } from "react-icons/io";
import { GiPauseButton } from "react-icons/gi";

import toast from "react-hot-toast";
import axios from "axios";

import {
  selectedConversationAtom,
  conversationsAtom,
  editingMessageAtom,
  messagesAtom,
} from "../atoms/messageAtom";

import { useRecoilState, useSetRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";

import { useAudioRecorder } from "react-audio-voice-recorder";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

// --- MIME helpers ---

function pickSupportedMime() {
  if (window?.MediaRecorder?.isTypeSupported) {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  }
  return "audio/webm";
}

function extFromMime(mime = "") {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp3")) return "mp3";
  return "webm";
}

const MessageInput = ({ setMessages }) => {
  const [messageText, setMessageText] = useState("");
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const setConversations = useSetRecoilState(conversationsAtom);
  const [editingMessage, setEditingMessage] = useRecoilState(editingMessageAtom);
  const user = useRecoilValue(userAtom);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const {
    startRecording,
    stopRecording,
    recordingBlob,
    isRecording,
    recordingTime,
  } = useAudioRecorder({ mimeType: pickSupportedMime() });

  const [voiceBlob, setVoiceBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const audioPlayerRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // --- Editing mode ---
  useEffect(() => {
    if (editingMessage) {
      setMessageText(editingMessage.text || "");
      inputRef.current?.focus();
    } else {
      setMessageText("");
    }
  }, [editingMessage]);

  // --- Voice blob ---
  useEffect(() => {
    if (recordingBlob) {
      setVoiceBlob(recordingBlob);
      setAudioURL(URL.createObjectURL(recordingBlob));
    }
  }, [recordingBlob]);

  // --- Audio player ---
  useEffect(() => {
    const p = audioPlayerRef.current;
    if (audioURL) p.src = audioURL;
    p.addEventListener("ended", () => setIsPlaying(false));
    return () => p.removeEventListener("ended", () => setIsPlaying(false));
  }, [audioURL]);

  // -------------------------
  // FILE HANDLING
  // -------------------------
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);

    const previews = files.map((f) => {
      if (f.type.startsWith("image/")) return { type: "image", url: URL.createObjectURL(f), name: f.name };
      if (f.type.startsWith("video/")) return { type: "video", name: f.name };
      if (f.type.startsWith("audio/")) return { type: "audio", name: f.name };
      if (f.type === "application/pdf") return { type: "pdf", name: f.name };
      if (f.type.includes("word")) return { type: "word", name: f.name };
      if (f.type.includes("excel")) return { type: "excel", name: f.name };
      return { type: "file", name: f.name };
    });

    setFilePreviews(previews);
    handleRemoveAudio();
  };

  const removeFile = (i) => {
    const nf = selectedFiles.filter((_, idx) => idx !== i);
    const np = filePreviews.filter((_, idx) => idx !== i);
    setSelectedFiles(nf);
    setFilePreviews(np);
    if (!nf.length) fileInputRef.current.value = null;
  };

  const handleRemoveAudio = () => {
    const p = audioPlayerRef.current;
    p.pause();
    p.currentTime = 0;
    setIsPlaying(false);
    setAudioURL(null);
    setVoiceBlob(null);
  };

  // ==========================================
  //          SEND MESSAGE (DUPLICATE FIX)
  // ==========================================
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isSending) return;

    const trimmed = messageText.trim();
    const hasFiles = selectedFiles.length > 0;
    const hasVoice = !!voiceBlob;

    if (!trimmed && !hasFiles && !hasVoice) {
      toast.error("Message or file cannot be empty.");
      return;
    }

    if (!selectedConversation) {
      toast.error("Please select a conversation first.");
      return;
    }

    setIsSending(true);

    // =====================================
    // TEMP MESSAGE — ONLY FOR SENDER
    // =====================================
    const tempId = Date.now().toString();

    const tempMessage = {
      _id: tempId,
      sender: user._id,
      text: trimmed,
      conversationId: selectedConversation._id,
      createdAt: new Date().toISOString(),
      attachments: [],
      seenBy: [user._id],
      status: "sending",
    };

    if (hasFiles) {
      tempMessage.attachments = selectedFiles.map((file, i) => ({
        url: filePreviews[i].url,
        type: filePreviews[i].type,
        name: file.name,
      }));
    } else if (hasVoice) {
      tempMessage.attachments = [
        {
          url: audioURL,
          type: "audio",
          name: `voice_${tempId}.${extFromMime(voiceBlob.type)}`,
        },
      ];
    }

    // ------------ IMPORTANT ------------
    // ✔ ONLY SENDER SHOULD ADD TEMP MESSAGE
    // ------------------------------------
    if (user._id !== selectedConversation.userId) {
      setMessages((prev) => [...prev, tempMessage]);
    }

    setMessageText("");
    setSelectedFiles([]);
    setFilePreviews([]);
    handleRemoveAudio();
    if (fileInputRef.current) fileInputRef.current.value = null;

    // ------------------------------
    // SEND TO BACKEND
    // ------------------------------
    try {
      const formData = new FormData();

      if (trimmed) formData.append("message", trimmed);
      formData.append("recipientId", selectedConversation.userId);

      if (!selectedConversation.mock) {
        formData.append("conversationId", selectedConversation._id);
      }

      if (hasFiles) {
        selectedFiles.forEach((file) => formData.append("files", file));
      } else if (hasVoice) {
        const mime = voiceBlob.type || "audio/webm";
        const ext = extFromMime(mime);
        const audioFile = new File([voiceBlob], `voice_${Date.now()}.${ext}`, {
          type: mime,
        });

        formData.append("files", audioFile);
      }

      const res = await api.post("/messages", formData);
      const actualMessage = res.data.data;

      // Replace temp → actual
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? actualMessage : m))
      );
    } catch (err) {
      toast.error("Failed to send message.");
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: "failed" } : m))
      );
    } finally {
      setIsSending(false);
    }
  };

  // --- Audio play ---
  const togglePlayPause = () => {
    const p = audioPlayerRef.current;
    if (isPlaying) p.pause();
    else p.play();
    setIsPlaying(!isPlaying);
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else {
      setSelectedFiles([]);
      setFilePreviews([]);
      handleRemoveAudio();
      startRecording();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const showSendBtn = messageText.trim() || selectedFiles.length > 0 || audioURL;

  return (
    <>
      {/* Voice preview */}
      {audioURL && (
        <HStack
          w="full"
          bg="gray.100"
          p={2}
          borderRadius="md"
          mb={2}
          alignItems="center"
        >
          <IconButton
            icon={isPlaying ? <GiPauseButton /> : <IoIosPlayCircle />}
            onClick={togglePlayPause}
            size="sm"
            colorScheme="blue"
          />
          <Text fontSize="sm" flex={1}>
            Voice message
          </Text>
          <IconButton
            icon={<FaTimes />}
            onClick={handleRemoveAudio}
            size="xs"
            colorScheme="red"
          />
        </HStack>
      )}

      {/* File attachments preview */}
      {filePreviews.length > 0 && (
        <Grid
          templateColumns="repeat(auto-fill, minmax(100px, 1fr))"
          gap={2}
          mt={4}
          p={2}
          bg="gray.50"
          borderRadius="md"
        >
          {filePreviews.map((p, i) => (
            <Flex
              key={i}
              w="full"
              h="100px"
              pos="relative"
              alignItems="center"
              justifyContent="center"
              direction="column"
              borderRadius="md"
              overflow="hidden"
            >
              {p.type === "image" ? (
                <Image src={p.url} objectFit="cover" w="full" h="full" />
              ) : (
                <Box fontSize="3xl">
                  {p.type === "video" && <FaFileVideo />}
                  {p.type === "audio" && <FaFileAudio />}
                  {p.type === "pdf" && <FaFilePdf />}
                  {p.type === "word" && <FaFileWord />}
                  {p.type === "excel" && <FaFileExcel />}
                  {p.type === "file" && <FaRegFileAlt />}
                </Box>
              )}

              <Text fontSize="xs" mt={1} noOfLines={1}>
                {p.name}
              </Text>

              <IconButton
                icon={<FaTimes />}
                size="xs"
                pos="absolute"
                top={1}
                right={1}
                colorScheme="red"
                onClick={() => removeFile(i)}
              />
            </Flex>
          ))}
        </Grid>
      )}

      {/* Input bar */}
      <Flex gap={2} alignItems="center" mt={2}>
        <InputGroup>
          <Input
            placeholder="Type a message…"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            ref={inputRef}
          />

          <InputRightElement w="auto" pr={2}>
            <HStack spacing={2} display={showSendBtn ? "none" : "flex"}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                multiple
                onChange={handleFileChange}
              />

              <IconButton
                icon={<FaPaperclip />}
                onClick={() => fileInputRef.current.click()}
                size="sm"
              />

              <IconButton
                icon={isRecording ? <FaStopCircle /> : <FaMicrophone />}
                onClick={toggleRecording}
                size="sm"
                colorScheme={isRecording ? "red" : "gray"}
              />
            </HStack>

            <IconButton
              icon={showSendBtn ? <IoSendSharp /> : <BsEmojiSmile />}
              size="sm"
              colorScheme="blue"
              ml={2}
              onClick={handleSendMessage}
              isDisabled={isSending}
            />
          </InputRightElement>
        </InputGroup>
      </Flex>
    </>
  );
};

export default MessageInput;
