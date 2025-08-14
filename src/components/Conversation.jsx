import { Flex,useColorModeValue,useColorMode, WrapItem,Avatar,AvatarBadge ,Stack,Text,Image,Box } from '@chakra-ui/react'
import React from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import userAtom from '../atoms/userAtom'
import { BsCheckAll, BsImage } from "react-icons/bs";
import { selectedConversationAtom } from '../atoms/messageAtom';

const Conversation = ({conversation,isOnline}) => {
    // Get the other user in the conversation
    const user= conversation.participants[0];
    // Get the last message sent in the conversation
    const lastMessage= conversation.lastMessage;
    const currentUser = useRecoilValue(userAtom);
    const colorMode = useColorMode();
    // Manage the currently selected conversation
    const [selectedConversation,setSelectedConversation] = useRecoilState(selectedConversationAtom);
    
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
                alignItems={"center"}
                p={"1"}
                // Hover effect for the conversation item
                _hover={{
                    cursor: "pointer",
                    bg: selectedBgColor, // Use a consistent hover color
                    color: selectedTextColor, // Use a consistent hover text color
                }}
                // Set the selected conversation when the item is clicked
                onClick={()=>setSelectedConversation({
                    _id: conversation._id,
                    userId: user._id,
                    username: user.username,
                    name:user.name,
                    userProfilePic: user.profilePic,
                    mock:conversation.mock
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
                        {currentUser._id === lastMessage.sender && (
                            <BsCheckAll size={16} color={lastMessage.seen ? "blue.400" : ""} />
                        )}
                        {/* Display the last message, or an image icon if it's a photo */}
                        {lastMessage.text ? (
                            <Text as="span">
                                {lastMessage.text.length > 20
                                    ? `${lastMessage.text.substring(0, 20)}...`
                                    : lastMessage.text}
                            </Text>
                        ) : (
                            <BsImage size={16} />
                        )}
                    </Text>
                </Stack>
            </Flex>
        </>
    );
};

export default Conversation;
