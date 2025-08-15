import React, { useState, useRef, useEffect } from 'react';
import {
    Flex,
    Image,
    Input,
    InputGroup,
    InputRightElement,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Spinner,
    useDisclosure,
    IconButton,
    useColorModeValue,
} from "@chakra-ui/react";
import { IoSendSharp } from "react-icons/io5";
import { BsEmojiSmile } from "react-icons/bs";
import toast from 'react-hot-toast';
import axios from 'axios';
import usePreviewImg from "../hooks/usePreviewImg";
import { selectedConversationAtom, conversationsAtom } from '../atoms/messageAtom';
import { useRecoilState, useSetRecoilState, useRecoilValue } from 'recoil';
import userAtom from '../atoms/userAtom';
import { FaPaperclip } from 'react-icons/fa';

// Create an axios instance here to use VITE_API_URL consistently.
const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
    baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
    withCredentials: true,
});

const MessageInput = ({ setMessages }) => {
    // State for the message input field content
    const [messageText, setMessageText] = useState("");
    // Recoil state for the currently selected conversation
    const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
    // Recoil setter for updating the conversation list
    const setConversations = useSetRecoilState(conversationsAtom);
    // Recoil state for the current user
    const user = useRecoilValue(userAtom);
    // useRef to link to the hidden file input
    const imageRef = useRef(null);
    // useRef for the message input field to set focus
    const inputRef = useRef(null);
    // useDisclosure hook for the image preview modal
    const { isOpen, onOpen, onClose } = useDisclosure();
    // Custom hook to handle image preview logic
    const { handleImageChange, imgUrl, setImgUrl } = usePreviewImg();
    // State for the loading status during API calls
    const [isSending, setIsSending] = useState(false);

    // Dynamic colors for Light/Dark mode
    const inputBg = useColorModeValue("white", "gray.600");
    const buttonBg = useColorModeValue("blue.500", "blue.400");
    const buttonHoverBg = useColorModeValue("blue.600", "blue.500");

    // Function to handle sending a message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        // Prevent multiple messages from being sent at once
        if (isSending) return;

        setIsSending(true);

        const isMessageEmpty = !messageText.trim();
        const isImageEmpty = !imgUrl;

        // A message or image must be present
        if (isMessageEmpty && isImageEmpty) {
            toast.error("Message or image cannot be empty");
            setIsSending(false);
            return;
        }

        try {
            // Get the current conversation ID from the state
            const currentConversationId = selectedConversation._id;

            // Use FormData to send both text and image data
            const formData = new FormData();
            if (messageText) {
                formData.append('message', messageText);
            }
            formData.append('recipientId', selectedConversation.userId);
            formData.append('conversationId', currentConversationId);
            
            // Append the image file to FormData
            const imageFile = imageRef.current.files[0];
            if (imageFile) {
                formData.append('image', imageFile); 
            }
            
            // Use the globally defined 'api' instance
            const response = await api.post('/messages', formData);

            const newMessage = response.data.data;
            const newConversationId = newMessage.conversationId;

            // Update the messages state with the new message
            setMessages((prevMessages) => [...prevMessages, newMessage]);
            
            // Clear the input fields
            setMessageText("");
            setImgUrl("");
            if (imageRef.current) {
                imageRef.current.value = null;
            }
            onClose();

            // Update the lastMessage in the conversation list
            setConversations((prevConvs) => {
                let conversationFound = false;
                const updatedConversations = prevConvs.map((conversation) => {
                    if (conversation._id === newConversationId) {
                        conversationFound = true;
                        return {
                            ...conversation,
                            lastMessage: {
                                text: newMessage.text || (newMessage.img ? "Image" : ""),
                                sender: newMessage.sender,
                            },
                        };
                    }
                    return conversation;
                });
                
                // If it's a new conversation, add it to the top of the list
                if (!conversationFound && selectedConversation.mock) {
                    const newConversation = {
                        ...selectedConversation,
                        _id: newConversationId,
                        mock: false,
                        lastMessage: {
                            text: newMessage.text || (newMessage.img ? "Image" : ""),
                            sender: newMessage.sender,
                        },
                    };
                    return [newConversation, ...prevConvs.filter(c => c._id !== selectedConversation._id)];
                }
                
                // Sort the conversation list to bring the most recent to the top
                if(conversationFound) {
                    const updatedConversation = updatedConversations.find(c => c._id === newConversationId);
                    const otherConversations = updatedConversations.filter(c => c._id !== newConversationId);
                    return [updatedConversation, ...otherConversations];
                }

                return updatedConversations;
            });
            

        } catch (error) {
            console.error(error);
            toast.error("Failed to send message.");
        } finally {
            setIsSending(false);
        }
    };
    
    // useEffect to auto-focus the input field whenever messageText changes
    useEffect(() => {
        if (messageText === "" && inputRef.current) {
            inputRef.current.focus();
        }
    }, [messageText]);


    const handleImageOpen = () => {
        imageRef.current.click();
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    return (
        <>
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
                        onClick={() => console.log("Emoji clicked")} // Placeholder for emoji functionality
                        aria-label="Add emoji"
                        icon={<BsEmojiSmile />}
                        bg="transparent"
                        size="lg"
                        color={useColorModeValue("gray.600", "gray.300")}
                        _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}
                    />
                    <InputGroup flex={1}>
                        <Input
                            placeholder="Type a message..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            bg="transparent"
                            border="none"
                            _focus={{
                                border: "none",
                                boxShadow: "none",
                            }}
                            py={2}
                            size="lg"
                            isDisabled={isSending}
                            ref={inputRef} // Set the ref to the input field
                        />
                        <InputRightElement height="100%" right="30px">
                            <Flex gap={1} alignItems="center">
                                <IconButton
                                    onClick={handleImageOpen}
                                    aria-label="Attach image"
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
                                    isRound={true}
                                    size="md"
                                    isDisabled={isSending || (!messageText.trim() && !imgUrl)}
                                    boxShadow="md"
                                />
                            </Flex>
                        </InputRightElement>
                    </InputGroup>
                    <Input type="file" hidden ref={imageRef} onChange={handleImageChange} />
                </Flex>
            </form>

            <Modal
                isOpen={!!imgUrl}
                onClose={() => {
                    setImgUrl("");
                }}
            >
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader></ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Flex mt={5} w={"full"} direction="column" alignItems="center">
                            <Image src={imgUrl} />
                            <Flex justifyContent={"flex-end"} my={2} width="100%">
                                {!isSending ? (
                                    <IconButton
                                        onClick={handleSendMessage}
                                        aria-label="Send image"
                                        icon={<IoSendSharp size={24} />}
                                        isRound={true}
                                        bg={buttonBg}
                                        color="white"
                                        _hover={{ bg: buttonHoverBg }}
                                    />
                                ) : (
                                    <Spinner size={"md"} />
                                )}
                            </Flex>
                        </Flex>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
};

export default MessageInput;