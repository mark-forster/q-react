import React, { useState } from "react";
import { Flex, Box, Text, Avatar, Skeleton, Image, useColorModeValue } from "@chakra-ui/react";
import { BsCheckAll } from "react-icons/bs";
import { useRecoilValue } from "recoil";
import { selectedConversationAtom } from "../atoms/messageAtom";
import userAtom from "../atoms/userAtom";
// You need to install moment.js for this feature.
// To install: npm install moment
import moment from "moment";

// Message component.
const Message = ({ ownMessage, message }) => {
    const selectedConversation = useRecoilValue(selectedConversationAtom);
    const user = useRecoilValue(userAtom);
    const [imgLoaded, setImgLoaded] = useState(false);

    // Message background colors for Light/Dark mode
    const ownMessageBgColor = useColorModeValue("blue.500", "blue.500");
    const otherMessageBgColor = useColorModeValue("gray.300", "gray.600");
    const otherMessageTextColor = useColorModeValue("black", "white");
    const timestampColor = useColorModeValue("gray.500", "gray.400");

    // Don't render the message if it's empty
    if (!message.text && !message.img) {
        return null;
    }

    return (
        <>
            {ownMessage ? (
                // Flex container for messages sent by the current user
                <Flex gap={2} alignSelf={"flex-end"} alignItems="flex-end">
                    {/* Main Flex container for message and timestamp */}
                    <Flex direction="column" alignItems="flex-end" maxWidth="350px">
                        {/* Image message */}
                        {message.img && (
                            <Box mt={1} w={"200px"} position="relative">
                                {!imgLoaded && <Skeleton w={"200px"} h={"200px"} />}
                                <Image
                                    src={message.img.url}
                                    alt='Message image'
                                    borderRadius={4}
                                    onLoad={() => setImgLoaded(true)}
                                    style={{ display: imgLoaded ? "block" : "none" }}
                                />
                                {/* Display seen icon and timestamp for images */}
                                {/* <Flex
                                    justifyContent="flex-end"
                                    alignItems="center"
                                    position="absolute"
                                    bottom="2"
                                    right="2"
                                    bg="rgba(0, 0, 0, 0.4)"
                                    borderRadius="md"
                                    p="1"
                                >
                                    <Text fontSize="xs" color="white" mr={1}>{moment(message.updatedAt).format('h:mm A')}</Text>
                                    <Box color={message.seen ? "cyan.400" : "gray.300"} fontWeight={"bold"}>
                                        <BsCheckAll size={16} />
                                    </Box>
                                </Flex> */}
                            </Box>
                        )}
                        {/* Text message */}
                        {message.text && (
                            <Flex bg={ownMessageBgColor} p={1} borderRadius={"md"}>
                                <Text color={"white"}>{message.text}</Text>
                            </Flex>
                        )}
                        {/* Timestamp for text messages (now outside the bubble) */}
                        <Flex mt={1} alignItems="center">
                            <Text fontSize="xs" color={timestampColor}>{moment(message.updatedAt).format('h:mm A')}</Text>
                            <Box ml={1} color={message.seen ? "cyan.400" : "gray.300"} fontWeight={"bold"}>
                                <BsCheckAll size={16} />
                            </Box>
                        </Flex>
                    </Flex>
                    {/* User's profile picture */}
                    <Avatar src={user.profilePic} w={8} h={8} /> 
                </Flex>
            ) : (
                // Flex container for messages received from the other user
                <Flex gap={2} alignSelf={"flex-start"} alignItems="flex-end">
                    {/* Other user's profile picture */}
                    <Avatar src={selectedConversation.userProfilePic} w={8} h={8} />
                    {/* Main Flex container for message and timestamp */}
                    <Flex direction="column" alignItems="flex-start" maxWidth="350px">
                        {/* Image message */}
                        {message.img && (
                            <Box mt={1} w={"200px"} position="relative">
                                {!imgLoaded && <Skeleton w={"200px"} h={"200px"} />}
                                <Image
                                    src={message.img.url}
                                    alt='Message image'
                                    borderRadius={4}
                                    onLoad={() => setImgLoaded(true)}
                                    style={{ display: imgLoaded ? "block" : "none" }}
                                />
                                {/* <Flex
                                    justifyContent="flex-end"
                                    mt={1}
                                    position="absolute"
                                    bottom="2"
                                    right="2"
                                    bg="rgba(0, 0, 0, 0.4)"
                                    borderRadius="md"
                                    p="1"
                                >
                                    <Text fontSize="xs" color="white">{moment(message.updatedAt).format('h:mm A')}</Text>
                                </Flex> */}
                            </Box>
                        )}
                        {/* Text message */}
                        {message.text && (
                            <Flex bg={otherMessageBgColor} p={1} borderRadius={"md"}>
                                <Text color={otherMessageTextColor}> {message.text}</Text>
                            </Flex>
                        )}
                        {/* Timestamp for text messages (now outside the bubble) */}
                        <Text fontSize="xs" color={timestampColor} mt={1}>{moment(message.updatedAt).format('h:mm A')}</Text>
                    </Flex>
                </Flex>
            )}
        </>
    );
};

export default Message;
