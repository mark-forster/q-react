import React, { useEffect, useState, useRef } from "react";
import {
    Flex,
    Text,
    Divider,
    Avatar,
    useColorModeValue,
    SkeletonCircle,
    Skeleton,
    Box
} from "@chakra-ui/react";
import Message from "./Message";
import MessageInput from "./MessageInput";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import {
    selectedConversationAtom,
    conversationsAtom,
} from "../atoms/messageAtom";
import axios from "axios";
import userAtom from "../atoms/userAtom";
import { useSocket } from "../context/SocketContext";
import messageSound from "../assets/sounds/msgSound.mp3";

// Component for the skeleton loading animation
const LoadingMessageSkeleton = ({ isSender }) => (
    <Flex
        gap={2}
        alignItems={"center"}
        p={1}
        borderRadius={"md"}
        alignSelf={isSender ? "flex-end" : "flex-start"}
    >
        {isSender ? <SkeletonCircle size={7} /> : null}
        <Flex flexDir={"column"} gap={2}>
            <Skeleton h="8px" w="250px" />
            <Skeleton h="8px" w="250px" />
            <Skeleton h="8px" w="250px" />
        </Flex>
        {!isSender ? <SkeletonCircle size={7} /> : null}
    </Flex>
);

const MessageContainer = () => {
    const [selectedConversation] = useRecoilState(selectedConversationAtom);
    const [loadingMessage, setLoadingMessage] = useState(true);
    const [messages, setMessages] = useState([]);
    const currentUser = useRecoilValue(userAtom);
    const { socket,onlineUsers } = useSocket();
    const setConversations = useSetRecoilState(conversationsAtom);
    const messageEndRef = useRef(null);

    const isOnline = selectedConversation?.userId && onlineUsers.includes(selectedConversation.userId);

    // Fetch messages for the conversation
    useEffect(() => {
        const getMessages = async () => {
            if (!selectedConversation?._id) return;
            setLoadingMessage(true);
            // Clear old messages
            setMessages([]);

            try {
                // Don't make an API call for mock conversations
                if (selectedConversation.mock) {
                    setLoadingMessage(false);
                    return;
                }

                // Fetch messages
                const response = await axios.get(
                    `/api/v1/messages/conversation/${selectedConversation._id}`
                );
                setMessages(response.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingMessage(false);
            }
        };
        getMessages();
    }, [selectedConversation._id, selectedConversation.mock, setMessages]);

    // Listen for real-time messages from the socket
    useEffect(() => {
        if (!socket) return;
        const handleNewMessage = (message) => {
            // Only handle messages for the currently selected conversation from other users
            if (selectedConversation?._id === message.conversationId && message.sender !== currentUser._id) {
                // Play a message sound
                const sound = new Audio(messageSound);
                sound.play();
                // Add the new message to the list
                setMessages((prev) => [...prev, message]);
            }

            // Update the last message in the conversation list
            setConversations((prev) => {
                const updatedConversations = prev.map((conversation) => {
                    if (conversation._id === message.conversationId) {
                        return {
                            ...conversation,
                            lastMessage: {
                                text: message.text,
                                sender: message.sender,
                            },
                        };
                    }
                    return conversation;
                });
                return updatedConversations;
            });
        };

        const handleMessagesSeen = ({ conversationId }) => {
            if (selectedConversation?._id?.toString() === conversationId?.toString()) {
                setMessages((prev) =>
                    prev.map((message) => {
                        if (!message.seen) {
                            return { ...message, seen: true };
                        }
                        return message;
                    })
                );
            }
        };

        socket.on("newMessage", handleNewMessage);
        socket.on("messagesSeen", handleMessagesSeen);

        return () => {
            socket.off("newMessage", handleNewMessage);
            socket.off("messagesSeen", handleMessagesSeen);
        };
    }, [socket, selectedConversation, setConversations, currentUser._id, setMessages]);

    // Scroll to the bottom of the message container whenever a new message arrives
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <Flex
            flex="70"
            bg={useColorModeValue("gray.200", "gray.dark")}
            borderRadius={"md"}
            p={2}
            flexDirection={"column"}
        >
            <Flex w={"full"} h={12} alignItems={"center"} gap={2}>
                <Box position="relative"> {/* Added this wrapper Box for relative positioning */}
                    <Avatar src={selectedConversation?.userProfilePic.url} size={"sm"} />
                    {isOnline && (
                        <Box
                            position="absolute"
                            bottom="-2px"
                            right="-2px"
                            h="8px"
                            w="8px"
                            bg="green.500"
                            borderRadius="full"
                            border="1px solid white"
                            transform="translate(50%, 50%)"
                        />
                    )}
                </Box>
                <Text display={"flex"} alignItems={"center"} position="relative">
                    {selectedConversation?.name}
                </Text>
            </Flex>
            <Divider />
            <Flex
                flexDir={"column"}
                flex={"flexGrow"} 
                gap={4}
                my={4}
                p={2}
                height={"400px"}
                overflowY={"auto"}
            >
                {loadingMessage &&
                    [...Array(20)].map((_, i) => (
                        <LoadingMessageSkeleton
                            key={i}
                            isSender={i % 2 === 0}
                        />
                    ))}
                    {!loadingMessage && messages.length === 0 && (
                    <Flex alignItems="center" justifyContent="center" height="100%">
                        <Text color="gray.500">No message, start a conversation</Text>
                    </Flex>
                )}
                {!loadingMessage &&
                    messages.map((message, index) => (
                        <Flex
                            key={message._id || index}
                            direction={"column"}
                            ref={
                                messages.length - 1 === messages.indexOf(message)
                                    ? messageEndRef
                                    : null
                            }
                        >
                            <Message
                                message={message}
                                ownMessage={currentUser._id === message.sender}
                            />
                        </Flex>
                    ))}
            </Flex>
            <MessageInput setMessages={setMessages} />
        </Flex>
    );
};

export default MessageContainer;
