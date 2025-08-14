import React, { useState, useRef } from 'react';
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
import toast from 'react-hot-toast';
import axios from 'axios';
import usePreviewImg from "../hooks/usePreviewImg";
import { selectedConversationAtom, conversationsAtom } from '../atoms/messageAtom';
import { useRecoilState, useSetRecoilState, useRecoilValue } from 'recoil';
import userAtom from '../atoms/userAtom';
import { FaLink } from 'react-icons/fa';

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
            
            const api = axios.create({
                baseURL: "/api/v1",
                withCredentials: true,
            });

            // Post the FormData object to the API
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
                    return updatedConversations.sort((a, b) => {
                        if (a._id === newConversationId) return -1;
                        if (b._id === newConversationId) return 1;
                        return 0;
                    });
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
                    p={4}
                    bg={useColorModeValue("gray.100", "gray.700")}
                    borderRadius="lg"
                    boxShadow="md"
                    mt={4}
                    gap={2}
                >
                    <IconButton
                        onClick={handleImageOpen}
                        aria-label="Attach image"
                        icon={<FaLink />}
                        bg="transparent"
                        size="md"
                        color={useColorModeValue("gray.600", "gray.300")}
                        _hover={{ bg: useColorModeValue("gray.200", "gray.600") }}
                        isDisabled={isSending}
                    />
                    <Input type="file" hidden ref={imageRef} onChange={handleImageChange} />
                    <InputGroup flex={1}>
                        <Input
                            placeholder="Type a message..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            bg={inputBg}
                            border="1px solid"
                            borderColor={useColorModeValue("gray.300", "gray.500")}
                            _focus={{
                                borderColor: "blue.500",
                                boxShadow: "0 0 0 1px #4299E1",
                            }}
                            borderRadius={"full"}
                            px={4}
                            py={2}
                            size="lg"
                            isDisabled={isSending}
                        />
                        <InputRightElement>
                            <IconButton
                                type="submit"
                                aria-label="Send message"
                                icon={isSending ? <Spinner size="sm" /> : <IoSendSharp />}
                                bg={buttonBg}
                                color="white"
                                _hover={{ bg: buttonHoverBg }}
                                isRound={true}
                                size="lg"
                                isDisabled={isSending || (!messageText.trim() && !imgUrl)}
                            />
                        </InputRightElement>
                    </InputGroup>
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
