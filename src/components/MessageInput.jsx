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
    HStack,
    Text,
} from "@chakra-ui/react";
import { IoSendSharp } from "react-icons/io5";
import { BsEmojiSmile, BsCheckLg } from "react-icons/bs";
import { FaPaperclip, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import axios from 'axios';
import usePreviewImg from "../hooks/usePreviewImg";
import { selectedConversationAtom, conversationsAtom, messagesAtom, editingMessageAtom } from '../atoms/messageAtom';
import { useRecoilState, useSetRecoilState, useRecoilValue } from 'recoil';
import userAtom from '../atoms/userAtom';

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
    const [selectedConversation] = useRecoilState(selectedConversationAtom);
    // Recoil setter for updating the conversation list
    const setConversations = useSetRecoilState(conversationsAtom);
    // Recoil state for the current user
    const user = useRecoilValue(userAtom);
    // Recoil state to track the message being edited
    const [editingMessage, setEditingMessage] = useRecoilState(editingMessageAtom);
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

    // This effect updates the input field when an edit is initiated or canceled
    useEffect(() => {
        if (editingMessage) {
            setMessageText(editingMessage.text);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        } else {
            setMessageText("");
            setImgUrl(""); // Clear any attached image when not editing
        }
    }, [editingMessage, setImgUrl]);

    // Function to handle sending/updating a message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (isSending) return;

        setIsSending(true);

        //  if we are in EDIT mode
        if (editingMessage) {
            // Logic for UPDATING a message
            if (messageText.trim() === editingMessage.text) {
                // No changes, so don't send an API call
                setIsSending(false);
                setEditingMessage(null); // Exit editing mode
                setMessageText("");
                return;
            }

            try {
                // API call to update the message
                const response = await api.put(`/messages/update/${editingMessage._id}`, { newText: messageText });
                const updatedMessage = response.data.data;

                // Update the messages state locally
                setMessages((prev) => 
                    prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m))
                );

                // Update the lastMessage in the conversation list
                setConversations((prevConvs) =>
                    prevConvs.map((conv) =>
                        conv._id === updatedMessage.conversationId ?
                        { ...conv, lastMessage: { ...conv.lastMessage, text: updatedMessage.text } } :
                        conv
                    )
                );

                toast.success("Message updated!");
                setEditingMessage(null); // Exit editing mode
            } catch (error) {
                console.error("Failed to update message:", error);
                toast.error("Failed to update message.");
            } finally {
                setIsSending(false);
                setMessageText("");
            }
        } else {
            // for CREATING a new message
            const isMessageEmpty = !messageText.trim();
            const isImageEmpty = !imgUrl;
            
            if (isMessageEmpty && isImageEmpty) {
                toast.error("Message or image cannot be empty");
                setIsSending(false);
                return;
            }

            try {
                const currentConversationId = selectedConversation._id;
                const formData = new FormData();
                if (messageText) {
                    formData.append('message', messageText);
                }
                formData.append('recipientId', selectedConversation.userId);
                formData.append('conversationId', currentConversationId);
                
                const imageFile = imageRef.current.files[0];
                if (imageFile) {
                    formData.append('image', imageFile); 
                }
                
                const response = await api.post('/messages', formData);
                const newMessage = response.data.data;
                const newConversationId = newMessage.conversationId;

                setMessages((prevMessages) => [...prevMessages, newMessage]);
                
                setMessageText("");
                setImgUrl("");
                if (imageRef.current) {
                    imageRef.current.value = null;
                }
                onClose();

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
        }
    };
    
    // Function to cancel the editing process
    const handleCancelEdit = () => {
        setEditingMessage(null); // Clear the Recoil state
    };

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
            {/* Conditional UI for when a message is being edited */}
            {editingMessage && (
                <HStack w="full" bg={useColorModeValue("gray.100", "gray.700")} p={2} borderRadius="md" mb={2}>
                    <Text fontSize="sm" color={useColorModeValue("gray.700", "gray.300")}>
                        Editing: {editingMessage.text.length > 50 ? editingMessage.text.substring(0, 50) + "..." : editingMessage.text}
                    </Text>
                    <IconButton
                        icon={<FaTimes />}
                        aria-label="Cancel edit"
                        size="xs"
                        onClick={handleCancelEdit}
                    />
                </HStack>
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
                            placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
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
                            ref={inputRef}
                        />
                        <InputRightElement height="100%" right="30px">
                            <Flex gap={1} alignItems="center">
                                {/* Hide the image attachment button while editing */}
                                {!editingMessage && (
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
                                )}
                                <IconButton
                                    type="submit"
                                    aria-label="Send message"
                                    icon={isSending ? <Spinner size="sm" color="white" /> : (editingMessage ? <BsCheckLg /> : <IoSendSharp />)}
                                    bg={buttonBg}
                                    color="white"
                                    _hover={{ bg: buttonHoverBg }}
                                    isRound={true}
                                    size="md"
                                    isDisabled={isSending || (editingMessage ? !messageText.trim() : (!messageText.trim() && !imgUrl))}
                                    boxShadow="md"
                                />
                            </Flex>
                        </InputRightElement>
                    </InputGroup>
                    <Input type="file" hidden ref={imageRef} onChange={handleImageChange} />
                </Flex>
            </form>

            <Modal
                isOpen={!!imgUrl && !editingMessage} // Ensure modal doesn't open when editing a text message
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