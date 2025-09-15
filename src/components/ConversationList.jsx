import React from "react";
import { Flex, Skeleton, SkeletonCircle, Box, Text } from "@chakra-ui/react";
import Conversation from "./Conversation";

const ConversationList = ({
  conversations,
  loading,
  onlineUsers,
  onConversationClick,
  onDelete,
}) => {
  if (loading) {
    return [0, 1, 2, 3, 4].map((_, i) => (
      <Flex key={i} gap={4} alignItems={"center"} p={"1"} borderRadius={"md"}>
        <Box>
          <SkeletonCircle size={"10"} />
        </Box>
        <Flex w={"full"} flexDirection={"column"} gap={3}>
          <Skeleton h={"10px"} w={"80px"} />
          <Skeleton h={"8px"} w={"90%"} />
        </Flex>
      </Flex>
    ));
  }

  if (conversations.length === 0) {
    return <Text textAlign="center" mt={4}>No conversations</Text>;
  }

  return (
    <Flex direction={"column"} gap={2} h="100%" overflowY="auto" mt={2}>
      {conversations.map((conversation) => {
        if (!conversation?.participants || conversation.participants.length === 0) {
          return null;
        }
        const isOnline = onlineUsers.includes(conversation.participants[0]?._id);
        return (
          <Conversation
            key={conversation._id}
            conversation={conversation}
            isOnline={isOnline}
            onDelete={() => onDelete(conversation._id)}
          />
        );
      })}
    </Flex>
  );
};

export default ConversationList;