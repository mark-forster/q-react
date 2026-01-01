// MessageInput.jsx — FINAL B3 + EDITING + TYPING

import React, { useState, useRef, useEffect } from "react";
import {
  Flex,
  Image,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
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
} from "../atoms/messageAtom";

import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";

import { useAudioRecorder } from "react-audio-voice-recorder";
import { useSocket } from "../context/SocketContext";

// ===================================================
// API
// ===================================================
const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

// ===================================================
// MIME Helpers
// ===================================================
function pickSupportedMime() {
  if (window?.MediaRecorder?.isTypeSupported) {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))
      return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) return "audio/ogg;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/ogg")) return "audio/ogg";
  }
  return "audio/webm";
}

function extFromMime(mime = "") {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mp3")) return "mp3";
  return "webm";
}

// ===================================================
// Component
// ===================================================
const MessageInput = ({ setMessages }) => {
  const [messageText, setMessageText] = useState("");

  const [selectedConversation, setSelectedConversation] =
    useRecoilState(selectedConversationAtom);

  const [editingMessage, setEditingMessage] = useRecoilState(editingMessageAtom);

  const setConversations = useSetRecoilState(conversationsAtom);
  const user = useRecoilValue(userAtom);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const { socket } = useSocket();

  // Recorder
  const {
    startRecording,
    stopRecording,
    recordingBlob,
    isRecording,
    recordingTime,
  } = useAudioRecorder({
    mimeType: pickSupportedMime(),
    audioConstraints: {
      channelCount: 1,
      noiseSuppression: true,
      echoCancellation: true,
      sampleRate: 48000,
    },
    onNotAllowedOrFound: () => toast.error("Microphone blocked or missing."),
  });

  const [voiceBlob, setVoiceBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const audioPlayerRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // Typing timeout (for stopTyping)
  const typingTimeoutRef = useRef(null);

  // ===================================================
  // APPLY EDITING MESSAGE INTO INPUT
  // ===================================================
  useEffect(() => {
    if (editingMessage && editingMessage.text !== undefined) {
      setMessageText(editingMessage.text || "");
      inputRef.current?.focus();
    } else if (!editingMessage?.replyTo) {
      // reply mode only => don't clear text
      setMessageText("");
    }
  }, [editingMessage]);

  // ===================================================
  // Recorder Blob → URL
  // ===================================================
  useEffect(() => {
    if (recordingBlob) {
      setVoiceBlob(recordingBlob);
      setAudioURL(URL.createObjectURL(recordingBlob));
    }
  }, [recordingBlob]);

  // ===================================================
  // Audio Player
  // ===================================================
  useEffect(() => {
    const p = audioPlayerRef.current;
    if (audioURL) p.src = audioURL;

    const onEnd = () => setIsPlaying(false);
    p.addEventListener("ended", onEnd);
    return () => p.removeEventListener("ended", onEnd);
  }, [audioURL]);

  // Cleanup typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // ===================================================
  // Files
  // ===================================================
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);

    const previews = files.map((f) => {
      if (f.type.startsWith("image/"))
        return { type: "image", url: URL.createObjectURL(f), name: f.name };
      if (f.type.startsWith("video/")) return { type: "video", name: f.name };
      if (f.type.startsWith("audio/")) return { type: "audio", name: f.name };
      if (f.type.includes("pdf")) return { type: "pdf", name: f.name };
      if (f.type.includes("word") || f.name.endsWith(".doc") || f.name.endsWith(".docx"))
        return { type: "word", name: f.name };
      if (f.type.includes("excel") || f.name.endsWith(".xls") || f.name.endsWith(".xlsx"))
        return { type: "excel", name: f.name };
      return { type: "file", name: f.name };
    });

    setFilePreviews(previews);
    handleRemoveAudio();
  };

  const removeFile = (i) => {
    setSelectedFiles((prev) => prev.filter((_, x) => x !== i));
    setFilePreviews((prev) => prev.filter((_, x) => x !== i));
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  // ===================================================
  // Remove Audio
  // ===================================================
  const handleRemoveAudio = () => {
    const p = audioPlayerRef.current;
    p.pause();
    setIsPlaying(false);
    setAudioURL(null);
    setVoiceBlob(null);
  };

  // ===================================================
  // MESSAGE EDITING LOGIC
  // ===================================================
  const updateMessage = async () => {
    try {
      const trimmed = messageText.trim();
      if (!trimmed) {
        toast.error("Message cannot be empty.");
        return;
      }

      if (trimmed === (editingMessage.text || "")) {
        setEditingMessage(null);
        setMessageText("");
        return;
      }

      const res = await api.put(
        `/messages/update/${editingMessage._id}`,
        { newText: trimmed }
      );

      const updated = res.data.data;

      // Update UI (messages state comes from parent via setMessages)
      setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));

      setConversations((prev) =>
        prev.map((c) =>
          c._id === updated.conversationId
            ? {
                ...c,
                lastMessage: {
                  ...(c.lastMessage || {}),
                  text: updated.text,
                  sender: updated.sender,
                  updatedAt: updated.updatedAt || updated.createdAt,
                },
              }
            : c
        )
      );

      // Emit socket event
      if (socket) {
        socket.emit("messageEdited", {
          messageId: updated._id,
          conversationId: selectedConversation._id,
          newText: updated.text,
        });
      }

      toast.success("Message updated!");
      setEditingMessage(null);
      setMessageText("");

      // stop typing when edit done
      emitStopTyping();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update message.");
    }
  };

  // ===================================================
  // TYPING EVENTS (Telegram-style)
  // ===================================================
  const emitTyping = () => {
    if (
      !socket ||
      !user?._id ||
      !selectedConversation?._id ||
      selectedConversation.mock ||
      String(selectedConversation._id).startsWith("mock-")
    )
      return;

    socket.emit("typing", {
      conversationId: selectedConversation._id,
      userId: user._id,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping();
    }, 1500);
  };

  const emitStopTyping = () => {
    if (
      !socket ||
      !user?._id ||
      !selectedConversation?._id ||
      selectedConversation.mock ||
      String(selectedConversation._id).startsWith("mock-")
    )
      return;

    socket.emit("stopTyping", {
      conversationId: selectedConversation._id,
      userId: user._id,
    });
  };

  const handleChangeText = (e) => {
    setMessageText(e.target.value);
    emitTyping();
  };

  // ==============================
// RECORDING STATUS EMIT
// ==============================
const emitRecording = () => {
  if (!socket || !selectedConversation?._id) return;

  socket.emit("recording", {
    conversationId: selectedConversation._id,
    userId: user._id,
  });
};

const emitStopRecording = () => {
  if (!socket || !selectedConversation?._id) return;

  socket.emit("stopRecording", {
    conversationId: selectedConversation._id,
    userId: user._id,
  });
};



  // ===================================================
  // SEND MESSAGE (B2 + EDIT MERGE)
  // ===================================================
  const handleSendMessage = async (e) => {
    e?.preventDefault?.();

    // ---------- EDIT MODE ----------
    if (editingMessage && editingMessage._id) {
      await updateMessage();
      return;
    }

    // ---------- ORIGINAL SEND ----------
    const trimmed = messageText.trim();
    const hasFiles = selectedFiles.length > 0;
    const hasVoice = !!voiceBlob;

    if (!trimmed && !hasFiles && !hasVoice) {
      toast.error("Message or file cannot be empty.");
      return;
    }

    if (!selectedConversation) {
      toast.error("Select a conversation first.");
      return;
    }

    setIsSending(true);

    // temp message (preview bubble)
    const tempId = "tmp_" + Date.now();
    const tempMessage = {
      _id: tempId,
      sender: {
    _id: user._id,          
    name: user.name,
    username: user.username,
    profilePic: user.profilePic,
  },
      text: trimmed,
      attachments: [],
      conversationId: selectedConversation._id,
      createdAt: new Date().toISOString(),
      seenBy: [user._id],
      status: "sending",
    };

    if (hasFiles) {
      tempMessage.attachments = filePreviews;
    } else if (hasVoice) {
      tempMessage.attachments = [
        {
          type: "audio",
          url: audioURL,
          name: `voice_${tempId}.${extFromMime(voiceBlob.type)}`,
        },
      ];
    }

    setMessages((prev) => [...prev, tempMessage]);

    setMessageText("");
    setSelectedFiles([]);
    setFilePreviews([]);
    handleRemoveAudio();
    if (fileInputRef.current) fileInputRef.current.value = null;
    emitStopTyping();

    // Form data
    const form = new FormData();
    if (trimmed) form.append("message", trimmed);

    if (!selectedConversation.mock)
      form.append("conversationId", selectedConversation._id);
    else
      form.append("recipientId", selectedConversation.userId);

    if (hasFiles) {
      selectedFiles.forEach((f) => form.append("files", f));
    } else if (hasVoice) {
      const mime = voiceBlob.type;
      const ext = extFromMime(mime);
      const audioFile = new File(
        [voiceBlob],
        `voice_${Date.now()}.${ext}`,
        { type: mime }
      );
      form.append("files", audioFile);
    }

    try {
      const res = await api.post("/messages", form);
      const real = res.data.data;

      // Replace temp
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? real : m))
      );
    } catch {
      toast.error("Failed to send.");
      setMessages((prev) =>
        prev.map((m) =>
          m._id === tempId ? { ...m, status: "failed" } : m
        )
      );
    } finally {
      setIsSending(false);
      handleRemoveAudio();
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  // ===================================================
  // Audio Controls
  // ===================================================
const toggleRecording = () => {
  if (isRecording) {
    stopRecording();
    emitStopRecording(); 
  } else {
    emitRecording();
    startRecording();
  }
};

  const togglePlayPause = () => {
    const p = audioPlayerRef.current;
    if (isPlaying) p.pause();
    else p.play();
    setIsPlaying(!isPlaying);
  };

  // ===================================================
  // Enter key send
  // ===================================================
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const showSendBtn =
    messageText.trim() || audioURL || selectedFiles.length > 0;

  // ===================================================
  // UI
  // ===================================================
  return (
    <>
      {/* Audio Preview */}
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
            Voice {Math.floor((recordingTime || 0) / 60)}:
            {(recordingTime || 0) % 60}
          </Text>
          <IconButton
            icon={<FaTimes />}
            onClick={handleRemoveAudio}
            size="xs"
            colorScheme="red"
          />
        </HStack>
      )}

      {/* File Preview Grid */}
      {filePreviews.length > 0 && (
        <Grid
          templateColumns="repeat(auto-fill, minmax(100px, 1fr))"
          gap={2}
          mt={4}
          p={2}
          bg="gray.50"
          borderRadius="md"
        >
          {filePreviews.map((p, index) => (
            <Flex
              key={index}
              direction="column"
              bg="white"
              borderRadius="md"
              p={2}
              alignItems="center"
              pos="relative"
            >
              {p.type === "image" ? (
                <Image src={p.url} w="100%" h="80px" objectFit="cover" borderRadius="md" />
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

              <Text noOfLines={1} fontSize="xs" mt={1}>
                {p.name}
              </Text>

              <IconButton
                onClick={() => removeFile(index)}
                icon={<FaTimes />}
                size="xs"
                pos="absolute"
                top={1}
                right={1}
                colorScheme="red"
              />
            </Flex>
          ))}
        </Grid>
      )}

      {/* Input */}
      <Flex gap={2} align="center" mt={2}>
        <InputGroup>
          <Input
            placeholder={
              editingMessage && editingMessage._id
                ? "Edit message..."
                : "Type a message..."
            }
            value={messageText}
            onChange={handleChangeText}
            onKeyDown={handleKeyDown}
            ref={inputRef}
          />

          <InputRightElement w="auto" pr={2}>
            <HStack spacing={2} display={showSendBtn ? "none" : "flex"}>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              <IconButton
                icon={<FaPaperclip />}
                onClick={() => fileInputRef.current?.click()}
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
