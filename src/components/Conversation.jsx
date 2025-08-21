import { Flex, useColorModeValue, useColorMode, WrapItem, Avatar, AvatarBadge, Stack, Text, Image, Box } from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import userAtom from '../atoms/userAtom'
import { BsCheckAll, BsImage } from "react-icons/bs";
import { selectedConversationAtom, conversationsAtom } from '../atoms/messageAtom';
import { io } from "socket.io-client";

// Create an axios instance here to use VITE_API_URL consistently.
const API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * The component representing a single conversation item in the chat list.
 * It has been refactored to react to real-time updates.
 *
 * @param {object} props
 * @param {object} props.conversation - The conversation object.
 * @param {boolean} props.isOnline - The online status of the other user.
 */
const Conversation = ({ conversation, isOnline }) => {
    // Get the conversations from the global state to listen for real-time updates
    const conversations = useRecoilValue(conversationsAtom);
    const currentUser = useRecoilValue(userAtom);
    const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
    const colorMode = useColorMode();
    
    // Find the latest version of this conversation from the global state
    // This ensures the component always displays the most up-to-date information,
    // especially the last message, without needing a page refresh.
    const latestConversation = conversations.find(c => c._id === conversation._id);
    const user = latestConversation?.participants[0] || conversation.participants[0];
    const lastMessage = latestConversation?.lastMessage || conversation.lastMessage;

    // Determine if the current conversation is selected
    const isSelected = selectedConversation?._id === conversation._id;

    // Define colors based on the selected state and color mode
    const selectedBgColor = useColorModeValue("gray.700", "gray.dark");
    const selectedTextColor = "white";
    const defaultBgColor = useColorModeValue("white", "gray.800"); // Use a lighter default background for light mode
    const defaultTextColor = useColorModeValue("gray.800", "white"); // Use a dark text color for light mode

    return (
        <>
            <Flex gap={4}
                minHeight={78}
                alignItems={"center"}
                p={"1"}
                // Hover effect for the conversation item
                _hover={{
                    cursor: "pointer",
                    bg: selectedBgColor, // Use a consistent hover color
                    color: selectedTextColor, // Use a consistent hover text color
                }}
                // Set the selected conversation when the item is clicked
                onClick={() => setSelectedConversation({
                    _id: conversation._id,
                    userId: user._id,
                    username: user.username,
                    name: user.name,
                    userProfilePic: user.profilePic,
                    mock: conversation.mock
                })}
                // Change background color if the conversation is selected
                bg={isSelected ? selectedBgColor : defaultBgColor}
                color={isSelected ? selectedTextColor : defaultTextColor}
                borderRadius={"md"}
            >
                <WrapItem>
                    <Avatar
                        size={{
                            base: "xs",
                            sm: "sm",
                            md: "md",
                        }}
                        src={user?.profilePic.url}
                    >
                        {/* Badge to show online status */}
                        {isOnline ? (
                            <AvatarBadge boxSize='1em' bg='green.500' />
                        ) : (
                            <AvatarBadge boxSize='1em' bg='orange.500' />
                        )}
                    </Avatar>
                </WrapItem>
                <Stack direction={"column"} fontSize={"sm"} overflow="hidden">
                    <Text fontWeight='700' display={"flex"} alignItems={"center"}>
                        {user?.name}
                    </Text>
                    <Text fontSize={"xs"} display={"flex"} alignItems={"center"} gap={1} whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">
                        {/* Display seen icon for messages sent by the current user */}
                        {lastMessage && currentUser._id === lastMessage.sender && (
                            <BsCheckAll size={16} color={lastMessage.seen ? "blue.400" : ""} />
                        )}
                        {/* Display the last message, or an image icon if it's a photo */}
                        {lastMessage?.text ? (
                            <Text as="span">
                                {lastMessage.text.length > 20
                                    ? `${lastMessage.text.substring(0, 20)}...`
                                    : lastMessage.text}
                            </Text>
                        ) : (
                            lastMessage?.attachments && lastMessage?.attachments.length > 0 ? (
                                <Box display="flex" alignItems="center" gap={1}>
                                    <BsImage size={16} />
                                    <Text as="span">Image</Text>
                                </Box>
                            ) : null
                        )}
                    </Text>
                </Stack>
            </Flex>
        </>
    );
};

export default Conversation;
