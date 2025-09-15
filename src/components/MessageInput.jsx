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
import { BsEmojiSmile, BsCheckLg, BsCheckAll } from "react-icons/bs";
import { FaPaperclip, FaTimes, FaMicrophone, FaStopCircle, FaRegFileAlt, FaFilePdf, FaFileWord, FaFileExcel } from "react-icons/fa";
import { IoIosPlayCircle } from "react-icons/io";
import { GiPauseButton } from "react-icons/gi";
import { FaFileVideo, FaFileAudio } from "react-icons/fa6";
import toast from "react-hot-toast";
import axios from "axios";
import { selectedConversationAtom, conversationsAtom, editingMessageAtom, messagesAtom } from "../atoms/messageAtom";
import { useRecoilState, useSetRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { useAudioRecorder } from "react-audio-voice-recorder";
import { useSocket } from "../context/SocketContext";

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
    const { socket } = useSocket();

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
        handleRemoveAudio();
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

        if (editingMessage) {
            try {
                setIsSending(true);
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
                socket.emit("messageEdited", {
                    messageId: updated._id,
                    conversationId: selectedConversation._id,
                    newText: updated.text,
                });

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
            return;
        }
        if (!selectedConversation) {
            toast.error("Please select a conversation first.");
            return;
        }

        setIsSending(true);

        const tempId = Date.now().toString();
        const tempMessage = {
            _id: tempId,
            sender: user._id,
            text: trimmed,
            conversationId: selectedConversation._id,
            createdAt: new Date().toISOString(),
            attachments: hasFiles
                ? selectedFiles.map((file, i) => ({
                    url: filePreviews[i].url || "",
                    type: filePreviews[i].type,
                    name: file.name,
                }))
                : hasVoice
                    ? [
                        {
                            url: audioURL,
                            type: "audio",
                            name: `voice_${tempId}.${extFromMime(voiceBlob.type)}`,
                        },
                    ]
                    : [],
            seenBy: [user._id],
            status: "sending",
        };

        setMessages((prev) => [...prev, tempMessage]);
        setMessageText("");
        setSelectedFiles([]);
        setFilePreviews([]);
        handleRemoveAudio();
        if (fileInputRef.current) fileInputRef.current.value = null;

        try {
            const formData = new FormData();
            if (trimmed) formData.append("message", trimmed);
            formData.append("recipientId", selectedConversation.userId);
            // Pass the conversation ID to the backend if it exists
            if (!selectedConversation.mock) {
                formData.append("conversationId", selectedConversation._id);
            }

            if (hasFiles) {
                selectedFiles.forEach((file) => formData.append("files", file));
            } else if (hasVoice) {
                const mime = voiceBlob.type || "audio/webm";
                const ext = extFromMime(mime);
                const audioFile = new File([voiceBlob], `voice_${Date.now()}.${ext}`, { type: mime });
                formData.append("files", audioFile);
            }

            const res = await api.post("/messages", formData);
            const actualMessage = res.data.data;

            if (selectedConversation.mock) {
                setSelectedConversation(prev => ({ ...prev, _id: actualMessage.conversationId, mock: false }));
                setConversations(prev => prev.map(c => c.mock ? { ...c, _id: actualMessage.conversationId, mock: false } : c));
            }
            
            setMessages((prev) =>
                prev.map((msg) => (msg._id === tempId ? { ...actualMessage, status: "sent" } : msg))
            );

            setConversations((prev) => {
                let found = false;
                const updated = prev.map((c) => {
                    if (c._id === actualMessage.conversationId) {
                        found = true;
                        return {
                            ...c,
                            lastMessage: {
                                text: actualMessage.text || (actualMessage.attachments?.length ? "Attachment" : ""),
                                sender: actualMessage.sender,
                                updatedAt: actualMessage.updatedAt || actualMessage.createdAt,
                            },
                        };
                    }
                    return c;
                });

                if (!found && selectedConversation.mock) {
                    const promoted = {
                        _id: actualMessage.conversationId,
                        mock: false,
                        isGroup: false,
                        participants: [
                            {
                                _id: selectedConversation.userId,
                                username: selectedConversation.username,
                                name: selectedConversation.name,
                                profilePic: selectedConversation.userProfilePic,
                            },
                            {
                                _id: user._id,
                                username: user.username,
                                name: user.name,
                                profilePic: user.profilePic,
                            },
                        ],
                        lastMessage: {
                            text: actualMessage.text || (actualMessage.attachments?.length ? "Attachment" : ""),
                            sender: actualMessage.sender,
                            updatedAt: actualMessage.updatedAt || actualMessage.createdAt,
                        },
                    };
                    return [promoted, ...prev.filter((c) => c._id !== selectedConversation._id)];
                }

                if (found) {
                    const top = updated.find((c) => c._id === actualMessage.conversationId);
                    const rest = updated.filter((c) => c._id !== actualMessage.conversationId);
                    return [top, ...rest];
                }

                return updated;
            });

            // 💡 NEW LOGIC: Emit a socket event after a successful message send.
            socket.emit("sendMessage", {
                ...actualMessage,
                conversationId: selectedConversation.mock ? actualMessage.conversationId : selectedConversation._id,
                recipientId: selectedConversation.userId,
            });

        } catch (err) {
            console.error(err);
            toast.error("Failed to send message.");
            setMessages((prev) => prev.map((msg) => (msg._id === tempId ? { ...msg, status: "failed" } : msg)));
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

    const showSendBtn = messageText.trim() || selectedFiles.length > 0 || audioURL;

    return (
        <>
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
                                <Box color={useColorModeValue("gray.600", "gray.400")} fontSize="3xl">
                                    {preview.type === "video" && <FaFileVideo />}
                                    {preview.type === "audio" && <FaFileAudio />}
                                    {preview.type === "pdf" && <FaFilePdf />}
                                    {preview.type === "word" && <FaFileWord />}
                                    {preview.type === "excel" && <FaFileExcel />}
                                    {preview.type === "file" && <FaRegFileAlt />}
                                </Box>
                            )}
                            <Text fontSize="xs" mt={1} noOfLines={1} color={useColorModeValue("gray.700", "gray.300")}>{preview.name}</Text>
                            <IconButton
                                icon={<FaTimes />}
                                onClick={() => removeFile(i)}
                                size="xs"
                                position="absolute"
                                top={1}
                                right={1}
                                colorScheme="red"
                                aria-label="Remove file"
                            />
                        </Flex>
                    ))}
                </Grid>
            )}

            <Flex gap={2} alignItems="center">
                <InputGroup>
                    <Input
                        w="full"
                        placeholder="Type a message..."
                        onChange={(e) => setMessageText(e.target.value)}
                        value={messageText}
                        onKeyDown={handleInputKeyDown}
                        ref={inputRef}
                        p={2}
                    />
                    <InputRightElement w="auto" pr={2}>
                        <HStack spacing={2} display={showSendBtn ? 'none' : 'flex'}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: "none" }}
                                onChange={handleFileChange}
                                multiple
                            />
                            <IconButton
                                icon={<FaPaperclip />}
                                aria-label="Attach file"
                                size="sm"
                                onClick={() => fileInputRef.current.click()}
                            />
                            <IconButton
                                icon={isRecording ? <FaStopCircle /> : <FaMicrophone />}
                                aria-label="Record voice"
                                size="sm"
                                colorScheme={isRecording ? "red" : "gray"}
                                onClick={toggleRecording}
                            />
                        </HStack>
                        <IconButton
                            icon={showSendBtn ? <IoSendSharp /> : <BsEmojiSmile />}
                            aria-label="Send message"
                            onClick={handleSendMessage}
                            colorScheme="blue"
                            size="sm"
                            ml={2}
                            display={showSendBtn ? 'flex' : 'none'}
                            isDisabled={isSending}
                        />
                    </InputRightElement>
                </InputGroup>
            </Flex>
        </>
    );
};

export default MessageInput;