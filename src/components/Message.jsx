import React, { useState } from "react";
import {
  Flex,
  Box,
  Text,
  Avatar,
  Skeleton,
  Image,
  useColorModeValue,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  HStack,
  IconButton,
} from "@chakra-ui/react";
import { BsCheckAll } from "react-icons/bs";
import { useRecoilValue } from "recoil";
import { selectedConversationAtom } from "../atoms/messageAtom";
import userAtom from "../atoms/userAtom";
import moment from "moment";
import { CiMenuKebab } from "react-icons/ci";
import { FaEdit, FaForward, FaTrash } from "react-icons/fa";

const Message = ({ ownMessage, message }) => {
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const user = useRecoilValue(userAtom);
  const [imgLoaded, setImgLoaded] = useState(false);

  const ownMessageBgColor = useColorModeValue("blue.500", "blue.500");
  const otherMessageBgColor = useColorModeValue("gray.300", "gray.600");
  const otherMessageTextColor = useColorModeValue("black", "white");
  const timestampColor = useColorModeValue("gray.500", "gray.400");
  const menuIconColor = useColorModeValue("gray.600", "gray.300");

  if (!message.text && !message.img) {
    return null;
  }

  // Handle menu actions (you'll implement the actual logic here)
  const handleEdit = () => {
    console.log("Edit message:", message._id);
  };
  const handleForward = () => {
    console.log("Forward message:", message._id);
  };
  const handleDelete = () => {
    console.log("Delete message:", message._id);
  };

  const menuIcons = (
    <HStack spacing={2}>
      <IconButton
        icon={<FaEdit />}
        aria-label="Edit message"
        onClick={handleEdit}
        size="sm"
        variant="ghost"
        colorScheme="blue"
      />
      <IconButton
        icon={<FaForward />}
        aria-label="Forward message"
        onClick={handleForward}
        size="sm"
        variant="ghost"
        colorScheme="blue"
      />
      <IconButton
        icon={<FaTrash />}
        aria-label="Delete message"
        onClick={handleDelete}
        size="sm"
        variant="ghost"
        colorScheme="red"
      />
    </HStack>
  );

  return (
    <>
      {ownMessage ? (
        <Flex
          gap={2}
          alignSelf="flex-end"
          alignItems="flex-end"
        >
          <Flex gap={1} alignItems="center">
            <Popover placement="top-end">
              <PopoverTrigger>
                <IconButton
                  icon={<CiMenuKebab />}
                  aria-label="Message menu"
                  size="xs"
                  variant="ghost"
                  color={menuIconColor}
                  // Here's the change: we add a negative margin to pull the icon up.
                  mt="-16px" 
                  marginLeft={"auto"}
                />
              </PopoverTrigger>
              <PopoverContent w="auto" _focus={{ outline: "none" }}>
                <PopoverBody p={2}>{menuIcons}</PopoverBody>
              </PopoverContent>
            </Popover>
            <Flex direction="column" alignItems="flex-end">
              {message.text && (
                <Flex
                  bg={ownMessageBgColor}
                  p={2}
                  borderRadius={"md"}
                  alignItems="center"
                >
                  <Text color={"white"} wordBreak="break-word" whiteSpace="pre-wrap">
                    {message.text}
                  </Text>
                </Flex>
              )}
              {message.img && (
                <Box mt={1} w={"200px"} position="relative">
                  {!imgLoaded && <Skeleton w={"200px"} h={"200px"} />}
                  <Image
                    src={message.img.url}
                    alt="Message image"
                    borderRadius={4}
                    onLoad={() => setImgLoaded(true)}
                    style={{ display: imgLoaded ? "block" : "none" }}
                  />
                </Box>
              )}
              <Flex mt={1} alignItems="center">
                <Text fontSize="xs" color={timestampColor}>
                  {moment(message.updatedAt).format("h:mm A")}
                </Text>
                <Box
                  ml={1}
                  color={message.seen ? "cyan.400" : "gray.300"}
                  fontWeight={"bold"}
                >
                  <BsCheckAll size={16} />
                </Box>
              </Flex>
            </Flex>
          </Flex>
          <Avatar src={user.profilePic} w={8} h={8} />
        </Flex>
      ) : (
        <Flex
          gap={2}
          alignSelf="flex-start"
          alignItems="flex-end"
        >
          <Avatar src={selectedConversation.userProfilePic} w={8} h={8} />
          <Flex gap={1} alignItems="center">
            <Flex direction="column" alignItems="flex-start">
              {message.text && (
                <Flex
                  bg={otherMessageBgColor}
                  p={2}
                  borderRadius={"md"}
                  alignItems="center"
                >
                  <Text color={otherMessageTextColor} wordBreak="break-word" whiteSpace="pre-wrap">
                    {message.text}
                  </Text>
                </Flex>
              )}
              {message.img && (
                <Box mt={1} w={"200px"} position="relative">
                  {!imgLoaded && <Skeleton w={"200px"} h={"200px"} />}
                  <Image
                    src={message.img.url}
                    alt="Message image"
                    borderRadius={4}
                    onLoad={() => setImgLoaded(true)}
                    style={{ display: imgLoaded ? "block" : "none" }}
                  />
                </Box>
              )}
              <Text fontSize="xs" color={timestampColor} mt={1}>
                {moment(message.updatedAt).format("h:mm A")}
              </Text>
            </Flex>
            <Popover placement="top-start">
              <PopoverTrigger>
                <IconButton
                  icon={<CiMenuKebab />}
                  aria-label="Message menu"
                  size="xs"
                  variant="ghost"
                  color={menuIconColor}
                  // Here's the change: we add a negative margin to pull the icon up.
                  mt="-16px" 
                />
              </PopoverTrigger>
              <PopoverContent w="auto" _focus={{ outline: "none" }}>
                <PopoverBody p={2}>{menuIcons}</PopoverBody>
              </PopoverContent>
            </Popover>
          </Flex>
        </Flex>
      )}
    </>
  );
};

export default Message;