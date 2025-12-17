// ConversationList.jsx — FINAL (with onOpenUserProfile support)

import React from "react";
import {
  Flex,
  Skeleton,
  SkeletonCircle,
  Text,
} from "@chakra-ui/react";

import Conversation from "./Conversation";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";

const ConversationList = ({
  conversations = [],
  loading = false,
  onlineUsers = [],
  onOpenGroupProfile,
  onOpenUserProfile,
  onDelete,
  deletingId
}) => {
  const currentUser = useRecoilValue(userAtom);

  // ---------------------------
  // LOADING SKELETON
  // ---------------------------
  if (loading) {
    return (
      <Flex direction="column" gap={3}>
        {[0, 1, 2, 3].map((i) => (
          <Flex key={i} gap={4} align="center" p={1}>
            <SkeletonCircle size="10" />
            <Flex flex={1} direction="column" gap={2}>
              <Skeleton h="10px" w="80px" />
              <Skeleton h="8px" w="90%" />
            </Flex>
          </Flex>
        ))}
      </Flex>
    );
  }

  // ---------------------------
  // NO CONVERSATIONS
  // ---------------------------
  if (!conversations.length) {
    return (
      <Text textAlign="center" mt={4} color="gray.500">
        No conversations
      </Text>
    );
  }

  // ---------------------------
  // RENDER LIST
  // ---------------------------
  return (
    <Flex direction="column" gap={2} overflowY="auto" h="100%" mt={1}>
      {conversations.map((conversation) => {
        if (
          !conversation?.participants ||
          conversation.participants.length === 0
        ) {
          return null;
        }

        const ids = conversation.participants.map((p) => String(p._id));
        const myId = String(currentUser?._id);

        // ONLINE detection
        let isOnline = false;

        if (conversation.isGroup) {
          const otherMembers = ids.filter((id) => id !== myId);
          isOnline = otherMembers.some((id) =>
            onlineUsers.includes(id)
          );
        } else {
          const other = ids.find((id) => id !== myId);
          isOnline = other ? onlineUsers.includes(other) : false;
        }

        return (
          <Conversation
            key={conversation._id}
            conversation={conversation}
            isOnline={isOnline}
            onDelete={onDelete}
            onOpenGroupProfile={onOpenGroupProfile}
            onOpenUserProfile={onOpenUserProfile}
            deletingId={deletingId}
          />
        );
      })}
    </Flex>
  );
};

export default ConversationList;
