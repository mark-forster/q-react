import React, { useEffect, useRef, useState } from "react";
import {
    Flex,
    Text,
    Divider,
    Avatar,
    useColorModeValue,
    SkeletonCircle,
    Skeleton,
    Box,
    AvatarBadge,
    IconButton,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    useToast,
} from "@chakra-ui/react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import {
    selectedConversationAtom,
    conversationsAtom,
    messagesAtom,
} from "../atoms/messageAtom";
import axios from "axios";
import userAtom from "../atoms/userAtom";
import { useSocket } from "../context/SocketContext";
import messageSound from "../assets/sounds/msgSound.wav";
import Message from "./Message";
import MessageInput from "./MessageInput";

// Icon imports for new header buttons
import { FiPhone, FiVideo } from "react-icons/fi";
import { CiMenuKebab } from "react-icons/ci";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
    baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
    withCredentials: true,
});

const LoadingMessageSkeleton = ({ isSender }) => (
    <Flex
        gap={2}
        alignItems={"center"}
        p={1}
        borderRadius={"md"}
        alignSelf={isSender ? "flex-end" : "flex-start"}
    >
        {isSender ? null : <SkeletonCircle size={7} />}
        <Flex flexDir={"column"} gap={2}>
            <Skeleton h="8px" w="250px" />
            <Skeleton h="8px" w="250px" />
            <Skeleton h="8px" w="250px" />
        </Flex>
        {isSender ? <SkeletonCircle size={7} /> : null}
    </Flex>
);

const MessageContainer = () => {
    const [selectedConversation] = useRecoilState(selectedConversationAtom);
    const [messages, setMessages] = useRecoilState(messagesAtom);
    const currentUser = useRecoilValue(userAtom);
    const { socket, onlineUsers } = useSocket();
    const setConversations = useSetRecoilState(conversationsAtom);
    const messageEndRef = useRef(null);
    const toast = useToast();
    const [loadingMessages, setLoadingMessages] = useState(true);

    const isOnline =
        selectedConversation?.userId &&
        onlineUsers.includes(selectedConversation.userId);

    useEffect(() => {
        const getMessages = async () => {
            if (!selectedConversation?._id) return;
            setMessages([]);
            setLoadingMessages(true);

            try {
                if (selectedConversation.mock) {
                    setLoadingMessages(false);
                    return;
                }
                const response = await api.get(
                    `/messages/conversation/${selectedConversation._id}`
                );
                setMessages(response.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingMessages(false);
            }
        };
        getMessages();
    }, [selectedConversation._id, selectedConversation.mock, setMessages]);

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message) => {
            // Update the messages list only if the message is for the currently selected conversation.
            if (selectedConversation?._id === message.conversationId) {
                setMessages((prev) => [...prev, message]);
                if (message.sender !== currentUser._id) {
                    const sound = new Audio(messageSound);
                    sound.play();
                }
            }

            // Update conversations list for all users (sender and recipient)
            setConversations((prevConvs) => {
                const updatedConvs = prevConvs.map((conv) => {
                    if (conv._id === message.conversationId) {
                        return {
                            ...conv,
                            lastMessage: {
                                text: message.text || (message.attachments?.length ? "Attachment" : ""),
                                sender: message.sender,
                                updatedAt: message.updatedAt || message.createdAt,
                            },
                        };
                    }
                    return conv;
                });

                const newMsgConv = updatedConvs.find(conv => conv._id === message.conversationId);
                if (newMsgConv) {
                    const otherConvs = updatedConvs.filter(conv => conv._id !== message.conversationId);
                    return [newMsgConv, ...otherConvs];
                }
                return updatedConvs;
            });
        };

        const handleMessagesSeen = ({ conversationId }) => {
            if (selectedConversation?._id === conversationId) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.sender === currentUser._id
                            ? { ...m, seenBy: Array.from(new Set([...(m.seenBy || []), selectedConversation.userId])) }
                            : m
                    )
                );
            }
        };

        socket.on("newMessage", handleNewMessage);
        socket.on("messagesSeen", handleMessagesSeen);

        return () => {
            socket.off("newMessage", handleNewMessage);
            socket.off("messagesSeen", handleMessagesSeen);
        };
    }, [socket, selectedConversation, setMessages, currentUser._id, setConversations]);

    useEffect(() => {
        if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, loadingMessages]);

    const containerBg = useColorModeValue("white", "gray.800");

    return (
        <Flex
            flex={70}
            bg={containerBg}
            borderRadius={"md"}
            p={4}
            flexDir={"column"}
        >
            {/* Header */}
            <Flex w={"full"} h={12} alignItems={"center"} gap={2}>
                <Avatar
                    src={selectedConversation?.userProfilePic?.url || "/no-pic.jpeg"}
                    w={9}
                    h={9}
                >
                    {isOnline && <AvatarBadge boxSize="1em" bg="green.500" />}
                </Avatar>
                <Flex flexDir="column" ml={1}>
                    <Text display={"flex"} alignItems={"center"} fontWeight={"bold"}>
                        {selectedConversation?.username}
                    </Text>
                    <Text fontSize={"xs"} color={"gray.500"}>
                        {isOnline ? "Online" : "Offline"}
                    </Text>
                </Flex>

                <Flex ml={"auto"} gap={2} alignItems={"center"}>
                    <IconButton
                        icon={<FiPhone />}
                        aria-label="Audio Call"
                        variant="ghost"
                        size="sm"
                    />
                    <IconButton
                        icon={<FiVideo />}
                        aria-label="Video Call"
                        variant="ghost"
                        size="sm"
                    />
                    <Menu>
                        <MenuButton
                            as={IconButton}
                            icon={<CiMenuKebab />}
                            aria-label="Options"
                            variant="ghost"
                            size="sm"
                        />
                        <MenuList>
                            <MenuItem
                                onClick={() =>
                                    toast({
                                        title: "Not implemented yet",
                                        description: "This feature is not yet available.",
                                        status: "info",
                                        duration: 3000,
                                        isClosable: true,
                                    })
                                }
                            >
                                View Profile
                            </MenuItem>
                        </MenuList>
                    </Menu>
                </Flex>
            </Flex>

            <Divider my={2} />

            {/* Message List */}
            <Flex
                flexGrow={1}
                flexDir={"column"}
                gap={4}
                overflowY={"auto"}
                p={4}
                css={{
                    "&::-webkit-scrollbar": {
                        width: "8px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                        backgroundColor: useColorModeValue("gray.300", "gray.600"),
                        borderRadius: "4px",
                    },
                }}
            >
                {loadingMessages ? (
                    <>
                        <LoadingMessageSkeleton isSender={false} />
                        <LoadingMessageSkeleton isSender={true} />
                        <LoadingMessageSkeleton isSender={false} />
                    </>
                ) : (
                    messages.map((message) => (
                        <Flex
                            key={message._id}
                            direction={"column"}
                        >
                            <Message
                                message={message}
                                ownMessage={message.sender === currentUser._id}
                            />
                        </Flex>
                    ))
                )}
                <div ref={messageEndRef} />
            </Flex>

            {/* Input Field */}
            <MessageInput setMessages={setMessages} />
        </Flex>
    );
};

export default MessageContainer;