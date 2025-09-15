import { Flex, Text, Avatar, useColorModeValue, Box, AvatarBadge, useColorMode } from "@chakra-ui/react";
import React from "react";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";

const SearchUserResult = ({ user, onClick, isOnline }) => {
  const currentUser = useRecoilValue(userAtom);
  const bg = useColorModeValue("gray.100", "gray.700");
  const hoverBg = useColorModeValue("gray.200", "gray.600");

  const handleClick = () => {
    onClick(user);
  };

  if (user._id === currentUser._id) {
    return null;
  }

  return (
    <Flex
      p={3}
      gap={4}
      alignItems={"center"}
      _hover={{
        cursor: "pointer",
        bg: hoverBg,
      }}
      onClick={handleClick}
      borderRadius={"md"}
      bg={bg}
    >
      <Avatar src={user.profilePic?.url} name={user.name}>
        {isOnline && <AvatarBadge boxSize="1em" bg="green.500" />}
      </Avatar>

      <Flex flexDirection={"column"}>
        <Text fontWeight={"bold"} display={"flex"} alignItems={"center"}>
          {user.username}
        </Text>
        <Text fontSize={"sm"} color={"gray.500"}>
          {user.name}
        </Text>
      </Flex>
    </Flex>
  );
};

export default SearchUserResult;