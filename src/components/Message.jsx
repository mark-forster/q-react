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

    // Don't render the message if it's empty
    if (!message.text && !message.img) {
        return null;
    }

    return (
        <>
            {ownMessage ? (
                // Flex container for messages sent by the current user
                // The main Flex is aligned to the right. The avatar is now the last child.
                <Flex gap={2} alignSelf={"flex-end"} alignItems="flex-end">
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
                            {/* Display seen icon and timestamp for images */}
                            <Flex justifyContent="flex-end" mt={1}>
                                <Text fontSize="xs" color="gray.500" mr={2}>{moment(message.updatedAt).fromNow()}</Text>
                                <Box color={message.seen ? "white" : ""} fontWeight={"bold"}>
                                    <BsCheckAll size={16} />
                                </Box>
                            </Flex>
                        </Box>
                    )}
                    {/* Text message */}
                    {message.text && (
                        <Flex bg={ownMessageBgColor} maxW={"350px"} p={1} borderRadius={"md"} flexDirection="column">
                            <Text color={"white"}>{message.text}</Text>
                            <Flex justifyContent="flex-end" alignItems="center" mt={1}>
                                <Text fontSize="xs" color="gray.300" mr={1}>{moment(message.updatedAt).fromNow()}</Text>
                                <Box alignSelf={"flex-end"} ml={1} color={message.seen ? "white" : ""} fontWeight={"bold"}>
                                    <BsCheckAll size={16} />
                                </Box>
                            </Flex>
                        </Flex>
                    )}
                    {/* User's profile picture is now on the right side */}
                    <Avatar src={user.profilePic.url} w={8} h={8} /> 
                </Flex>
            ) : (
                // Flex container for messages received from the other user
                <Flex gap={2} alignSelf={"flex-start"} alignItems="flex-end">
                    {/* Other user's profile picture */}
                    <Avatar src={selectedConversation.userProfilePic.url} w={8} h={8} />
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
                            <Flex justifyContent="flex-start" mt={1}>
                                <Text fontSize="xs" color="gray.500" mr={2}>{moment(message.updatedAt).fromNow()}</Text>
                            </Flex>
                        </Box>
                    )}
                    {/* Text message */}
                    {message.text && (
                        <Flex bg={otherMessageBgColor} maxW={"350px"} p={1} borderRadius={"md"}>
                            <Text color={otherMessageTextColor}> {message.text}</Text>
                            <Flex justifyContent="flex-end" alignItems="center" mt={1}>
                                <Text fontSize="xs" color="gray.500" ml={1}>{moment(message.updatedAt).fromNow()}</Text>
                            </Flex>
                        </Flex>
                    )}
                </Flex>
            )}
        </>
    );
};

export default Message;
