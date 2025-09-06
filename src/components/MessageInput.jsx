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
} from "@chakra-ui/react";
import { IoSendSharp } from "react-icons/io5";
import { BsEmojiSmile, BsCheckLg } from "react-icons/bs";
import { FaPaperclip, FaTimes, FaMicrophone, FaStopCircle, FaRegFileAlt, FaFilePdf, FaFileWord, FaFileExcel } from "react-icons/fa";
import { IoIosPlayCircle } from "react-icons/io";
import { GiPauseButton } from "react-icons/gi";
import { FaFileVideo, FaFileAudio } from "react-icons/fa6";
import toast from "react-hot-toast";
import axios from "axios";
import { selectedConversationAtom, conversationsAtom, editingMessageAtom } from "../atoms/messageAtom";
import { useRecoilState, useSetRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { useAudioRecorder } from "react-audio-voice-recorder";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

function pickSupportedMime() {
  if (typeof window !== "undefined" && window.MediaRecorder?.isTypeSupported) {
    if (window.MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    if (window.MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (window.MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) return "audio/ogg;codecs=opus";
    if (window.MediaRecorder.isTypeSupported("audio/ogg")) return "audio/ogg";
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

const MessageInput = ({ setMessages }) => {
  const [messageText, setMessageText] = useState("");
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const setConversations = useSetRecoilState(conversationsAtom);
  const user = useRecoilValue(userAtom);
  const [editingMessage, setEditingMessage] = useRecoilState(editingMessageAtom);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [isSending, setIsSending] = useState(false);

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
    onNotAllowedOrFound: (err) => {
      console.error("Mic not allowed/found", err);
      toast.error("Microphone blocked or not found.");
    },
  });

  const [voiceBlob, setVoiceBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const audioPlayerRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingMessage) {
      setMessageText(editingMessage.text || "");
      inputRef.current?.focus();
    } else {
      setMessageText("");
    }
  }, [editingMessage]);

  useEffect(() => {
    if (recordingBlob) {
      setVoiceBlob(recordingBlob);
      setAudioURL(URL.createObjectURL(recordingBlob));
    }
  }, [recordingBlob]);

  useEffect(() => {
    const player = audioPlayerRef.current;
    if (audioURL) player.src = audioURL;
    const onEnded = () => setIsPlaying(false);
    player.addEventListener("ended", onEnded);
    return () => player.removeEventListener("ended", onEnded);
  }, [audioURL]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    const previews = files.map((f) => {
      if (f.type.startsWith("image/")) {
        return { type: "image", url: URL.createObjectURL(f), name: f.name };
      }
      if (f.type.startsWith("video/")) {
        return { type: "video", name: f.name };
      }
      if (f.type.startsWith("audio/")) {
        return { type: "audio", name: f.name };
      }
      if (f.type === "application/pdf") {
        return { type: "pdf", name: f.name };
      }
      if (f.type.includes("word") || f.name.endsWith(".doc") || f.name.endsWith(".docx")) {
        return { type: "word", name: f.name };
      }
      if (f.type.includes("excel") || f.name.endsWith(".xls") || f.name.endsWith(".xlsx")) {
        return { type: "excel", name: f.name };
      }
      return { type: "file", name: f.name };
    });
    setFilePreviews(previews);
    handleRemoveAudio(); // files take precedence
  };

  const removeFile = (idx) => {
    const nf = selectedFiles.filter((_, i) => i !== idx);
    const np = filePreviews.filter((_, i) => i !== idx);
    setSelectedFiles(nf);
    setFilePreviews(np);
    if (nf.length === 0 && fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleRemoveAudio = () => {
    const p = audioPlayerRef.current;
    p.pause();
    setIsPlaying(false);
    setAudioURL(null);
    setVoiceBlob(null);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isSending) return;
    setIsSending(true);

    if (editingMessage) {
      try {
        const trimmed = messageText.trim();
        if (trimmed === (editingMessage.text || "")) {
          setEditingMessage(null);
          setMessageText("");
          setIsSending(false);
          return;
        }
        const res = await api.put(`/messages/update/${editingMessage._id}`, { newText: trimmed });
        const updated = res.data.data;

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

    const trimmed = messageText.trim();
    const hasFiles = selectedFiles.length > 0;
    const hasVoice = !!voiceBlob;

    if (!trimmed && !hasFiles && !hasVoice) {
      toast.error("Message, file, or voice message cannot be empty");
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
      if (trimmed) formData.append("message", trimmed);
      formData.append("recipientId", selectedConversation.userId);
      formData.append("conversationId", selectedConversation._id);

      if (hasFiles) {
        selectedFiles.forEach((file) => formData.append("files", file));
      } else if (hasVoice) {
        const mime = voiceBlob.type || "audio/webm";
        const ext = extFromMime(mime);
        const audioFile = new File([voiceBlob], `voice_${Date.now()}.${ext}`, { type: mime });
        formData.append("files", audioFile);
      }

      const res = await api.post("/messages", formData);
      const newMessage = res.data.data;
      const newConversationId = newMessage.conversationId;

      setMessages((prev) => [...prev, newMessage]);

      setMessageText("");
      setSelectedFiles([]);
      setFilePreviews([]);
      handleRemoveAudio();
      if (fileInputRef.current) fileInputRef.current.value = null;

      setConversations((prev) => {
        let found = false;
        const updated = prev.map((c) => {
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
            ],
            lastMessage: {
              text: newMessage.text || (newMessage.attachments?.length ? "Attachment" : ""),
              sender: newMessage.sender,
              updatedAt: newMessage.updatedAt || newMessage.createdAt,
            },
          };
          return [promoted, ...prev.filter((c) => c._id !== selectedConversation._id)];
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

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
      toast.success("Recording stopped.");
    } else {
      setSelectedFiles([]);
      setFilePreviews([]);
      fileInputRef.current && (fileInputRef.current.value = null);
      handleRemoveAudio();
      startRecording();
      toast.success("Recording started...");
    }
  };

  const togglePlayPause = () => {
    const p = audioPlayerRef.current;
    if (isPlaying) p.pause();
    else p.play();
    setIsPlaying(!isPlaying);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const showSendBtn = isSending || messageText.trim() || selectedFiles.length > 0 || audioURL;

  return (
    <>
      {/* voice preview */}
      {audioURL && (
        <HStack w="full" bg={useColorModeValue("gray.100", "gray.700")} p={2} borderRadius="md" mb={2} alignItems="center">
          <IconButton icon={isPlaying ? <GiPauseButton /> : <IoIosPlayCircle />} aria-label="Play/Pause Voice" onClick={togglePlayPause} size="sm" colorScheme="blue" />
          <Text fontSize="sm" flex={1}>
            Voice {Math.floor((recordingTime || 0) / 60).toString().padStart(2, "0")}:
            {((recordingTime || 0) % 60).toString().padStart(2, "0")}
          </Text>
          <IconButton icon={<FaTimes />} aria-label="Remove Voice" onClick={handleRemoveAudio} size="xs" colorScheme="red" />
        </HStack>
      )}

      {/* image and file previews */}
      {filePreviews.length > 0 && (
        <Grid templateColumns="repeat(auto-fill, minmax(100px, 1fr))" gap={2} mt={4} p={2}
          bg={useColorModeValue("gray.50", "gray.800")} borderRadius="md"
          border="1px solid" borderColor={useColorModeValue("gray.200", "gray.700")}>
          {filePreviews.map((preview, i) => (
            <Flex key={i} position="relative" w="full" h="100px" overflow="hidden" borderRadius="md"
              alignItems="center" justifyContent="center" direction="column" textAlign="center" p={1}>
              {preview.type === "image" ? (
                <Image src={preview.url} alt={`preview-${i}`} objectFit="cover" w="full" h="full" />
              ) : (
                <Flex direction="column" alignItems="center" justifyContent="center" color="gray.500" h="full">
                  {preview.type === "pdf" && <FaFilePdf size="3em" />}
                  {preview.type === "word" && <FaFileWord size="3em" />}
                  {preview.type === "excel" && <FaFileExcel size="3em" />}
                  {preview.type === "video" && <FaFileVideo size="3em" />}
                  {preview.type === "audio" && <FaFileAudio size="3em" />}
                  {preview.type === "file" && <FaRegFileAlt size="3em" />}
                  <Text fontSize="xs" mt={2} noOfLines={2}>{preview.name}</Text>
                </Flex>
              )}
              <IconButton icon={<FaTimes />} onClick={() => removeFile(i)} position="absolute" top={1} right={1}
                size="xs" colorScheme="red" aria-label="Remove image" isRound />
            </Flex>
          ))}
        </Grid>
      )}

      <form onSubmit={handleSendMessage} style={{ width: "100%" }}>
        <Flex alignItems={"center"} p={0} bg={useColorModeValue("white", "gray.700")}
          borderRadius="full" boxShadow="xl" mt={4} gap={2}
          border="1px solid" borderColor={useColorModeValue("gray.200", "gray.600")}>
          <IconButton onClick={() => {}} aria-label="Add emoji" icon={<BsEmojiSmile />} bg="transparent" size="lg"
            color={useColorModeValue("gray.600", "gray.300")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }} />

          <InputGroup flex={1}>
            <Input
              placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleInputKeyDown}
              bg="transparent" border="none" _focus={{ border: "none", boxShadow: "none" }}
              py={2} size="lg" isDisabled={isSending || isRecording} ref={inputRef}
            />
            <InputRightElement height="100%" right="30px">
              <Flex gap={1} alignItems="center">
                {!editingMessage && (
                  <IconButton onClick={() => fileInputRef.current?.click()} aria-label="Attach files" icon={<FaPaperclip />}
                    bg="transparent" size="lg" color={useColorModeValue("gray.600", "gray.300")}
                    _hover={{ bg: useColorModeValue("gray.100", "gray.600") }} isDisabled={isSending || isRecording} />
                )}
                {!editingMessage && !messageText.trim() && !selectedFiles.length && !audioURL && (
                  <IconButton onClick={toggleRecording} aria-label={isRecording ? "Stop Recording" : "Start Recording"}
                    icon={isRecording ? <FaStopCircle /> : <FaMicrophone />} bg="transparent" size="lg"
                    color={isRecording ? "red.500" : useColorModeValue("gray.600", "gray.300")}
                    _hover={{ bg: useColorModeValue("gray.100", "gray.600") }} isDisabled={isSending} />
                )}

                {editingMessage ? (
                  <IconButton type="submit" aria-label="Update message"
                    icon={isSending ? <Spinner size="sm" color="white" /> : <BsCheckLg />}
                    bg={useColorModeValue("blue.500", "blue.400")} color="white"
                    _hover={{ bg: useColorModeValue("blue.600", "blue.500") }}
                    isRound size="md" isDisabled={isSending || !messageText.trim()} boxShadow="md" />
                ) : (
                  (showSendBtn) && (
                    <IconButton type="submit" aria-label="Send message"
                      icon={isSending ? <Spinner size="sm" color="white" /> : <IoSendSharp />}
                      bg={useColorModeValue("blue.500", "blue.400")} color="white"
                      _hover={{ bg: useColorModeValue("blue.600", "blue.500") }}
                      isRound size="md" isDisabled={isSending} boxShadow="md" />
                  )
                )}
              </Flex>
            </InputRightElement>
          </InputGroup>

          <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileChange} />
        </Flex>
      </form>
    </>
  );
};

export default MessageInput;