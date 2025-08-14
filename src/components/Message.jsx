import React, { useState } from "react";
import { Flex, Box, Text, Avatar, Skeleton, Image, useColorModeValue } from "@chakra-ui/react";
import { BsCheckAll } from "react-icons/bs";
import { useRecoilValue } from "recoil";
import { selectedConversationAtom } from "../atoms/messageAtom";
import userAtom from "../atoms/userAtom";

// Message component.
const Message = ({ ownMessage, message }) => {
    const selectedConversation = useRecoilValue(selectedConversationAtom);
    const user = useRecoilValue(userAtom);
    const [imgLoaded, setImgLoaded] = useState(false);

    // Message background colors for Light/Dark mode
    const ownMessageBgColor = useColorModeValue("blue.500", "blue.500");
    const otherMessageBgColor = useColorModeValue("gray.300", "gray.600");
    const otherMessageTextColor = useColorModeValue("black", "white");

    // Don't render the message if it's empty
    if (!message.text && !message.img) {
        return null;
    }

    return (
        <>
            {ownMessage ? (
                // Flex container for messages sent by the current user
                // The main Flex is aligned to the right. The avatar is now the first child.
                <Flex gap={2} alignSelf={"flex-end"} alignItems="flex-end">
                    {/* User's profile picture is now on the left side */}
                    <Avatar src={user.profilePic.url} w={8} h={8} /> 
                    {/* Image message */}
                    {message.img && (
                        <Box mt={1} w={"200px"}>
                            {!imgLoaded && <Skeleton w={"200px"} h={"200px"} />}
                            <Image
                                src={message.img.url}
                                alt='Message image'
                                borderRadius={4}
                                onLoad={() => setImgLoaded(true)}
                                style={{ display: imgLoaded ? "block" : "none" }}
                            />
                            {/* Display seen icon for images */}
                            <Flex justifyContent="flex-end" mt={1}>
                                <Box color={message.seen ? "white" : ""} fontWeight={"bold"}>
                                    <BsCheckAll size={16} />
                                </Box>
                            </Flex>
                        </Box>
                    )}
                    {/* Text message */}
                    {message.text && (
                        <Flex bg={ownMessageBgColor} maxW={"350px"} p={1} borderRadius={"md"}>
                            <Text color={"white"}>{message.text}</Text>
                            <Box alignSelf={"flex-end"} ml={1} color={message.seen ? "white" : ""} fontWeight={"bold"}>
                                <BsCheckAll size={16} />
                            </Box>
                        </Flex>
                    )}
                </Flex>
            ) : (
                // Flex container for messages received from the other user
                <Flex gap={2} alignSelf={"flex-start"} alignItems="flex-end">
                    {/* Other user's profile picture */}
                    <Avatar src={selectedConversation.userProfilePic.url} w={8} h={8} /> {/* Made the avatar size a bit bigger for better visibility */}
                    {/* Image message */}
                    {message.img && (
                        <Box mt={1} w={"200px"}>
                            {!imgLoaded && <Skeleton w={"200px"} h={"200px"} />}
                            <Image
                                src={message.img.url}
                                alt='Message image'
                                borderRadius={4}
                                onLoad={() => setImgLoaded(true)}
                                style={{ display: imgLoaded ? "block" : "none" }}
                            />
                        </Box>
                    )}
                    {/* Text message */}
                    {message.text && (
                        <Flex bg={otherMessageBgColor} maxW={"350px"} p={1} borderRadius={"md"}>
                            <Text color={otherMessageTextColor}> {message.text}</Text>
                        </Flex>
                    )}
                </Flex>
            )}
        </>
    );
};

export default Message;
