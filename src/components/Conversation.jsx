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
    
    return (
        <>
            <Flex gap={4}
                alignItems={"center"}
                p={"1"}
                // Hover effect for the conversation item
                _hover={{
                    cursor: "pointer",
                    bg: useColorModeValue("gray.600", "gray.dark"),
                    color: "white",
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
                bg={
                    selectedConversation?._id === conversation._id ? (colorMode === "light" ? "gray.900" : "gray.dark") : ""
                }
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
                <Stack direction={"column"} fontSize={"sm"}>
                    <Text fontWeight='700' display={"flex"} alignItems={"center"}>
                        {user?.name}
                    </Text>
                    <Text fontSize={"xs"} display={"flex"} alignItems={"center"} gap={1}>
                        {/* Display seen icon for messages sent by the current user */}
                        {currentUser._id === lastMessage.sender ? (
                            <BsCheckAll size={16} color={lastMessage.seen ? "blue.400" : ""}/>
                        ) : (
                            ""
                        )}
                        {/* Display the last message, or an image icon if it's a photo */}
                        {lastMessage.text.length > 18
                            ? lastMessage.text.substring(0, 18) + "..."
                            : lastMessage.text || <BsImage size={16} />}
                    </Text>
                </Stack>
            </Flex>
        </>
    );
};

export default Conversation;