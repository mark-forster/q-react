// ChatPage.jsx (FIXED — NO message duplication, seen API only in MessageContainer)
import {
  Box,
  Flex,
  Text,
  Input,
  Skeleton,
  SkeletonCircle,
  InputGroup,
  InputLeftElement,
  IconButton,
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import MessageContainer from "./components/MessageContainer";
import axios from "axios";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  conversationsAtom,
  selectedConversationAtom,
  messagesAtom,
} from "./atoms/messageAtom";
import userAtom from "./atoms/userAtom";
import { useSocket } from "./context/SocketContext";
import { SearchIcon, ChevronLeftIcon } from "@chakra-ui/icons";
import Header from "./components/Header";
import ConversationTabs from "./components/ConversationTabs";
import SearchUserResult from "./components/SearchUserResult";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

const ChatPage = () => {
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [searchingUser, setSearchingUser] = useState(false);

  const [conversations, setConversations] = useRecoilState(conversationsAtom);
  const [selectedConversation, setSelectedConversation] = useRecoilState(
    selectedConversationAtom
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedUsers, setSearchedUsers] = useState([]);

  const currentUser = useRecoilValue(userAtom);
  const setMessages = useRecoilState(messagesAtom)[1];

  const { socket, onlineUsers } = useSocket();

  // ❌ (old) Mark conversation seen here → removed
  // seen logic is now centralized in MessageContainer

  // ChatPage ONLY listens for conversation-level events
  useEffect(() => {
    if (!socket) return;

    const handleConversationCreated = (newConversation) => {
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === newConversation._id);
        if (exists) return prev;
        return [{ ...newConversation, unreadCount: 1 }, ...prev];
      });
      toast.success("New conversation started!");
    };

    const handleConversationDeleted = ({ conversationId }) => {
      setConversations((prev) =>
        prev.filter((c) => c._id !== conversationId)
      );
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      toast.success("Conversation deleted.");
    };

    const handleMessageUpdated = ({ messageId, newText }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, text: newText } : msg
        )
      );
    };

    socket.on("conversationCreated", handleConversationCreated);
    socket.on("conversationPermanentlyDeleted", handleConversationDeleted);
    socket.on("messageUpdated", handleMessageUpdated);

    return () => {
      socket.off("conversationCreated", handleConversationCreated);
      socket.off("conversationPermanentlyDeleted", handleConversationDeleted);
      socket.off("messageUpdated", handleMessageUpdated);
    };
  }, [socket, selectedConversation, setConversations, setMessages]);

  // Initial conversation fetch
  useEffect(() => {
    const getConversations = async () => {
      try {
        const { data } = await api.get("/messages/conversations");
        let fetched = data.conversations || data;

        fetched = fetched.filter(
          (c) => !(c.deletedBy && c.deletedBy.includes(currentUser._id))
        );

        fetched.sort((a, b) => {
          const aTime = a.lastMessage?.updatedAt || a.createdAt;
          const bTime = b.lastMessage?.updatedAt || b.createdAt;
          return new Date(bTime) - new Date(aTime);
        });

        setConversations(fetched);

        const savedId = localStorage.getItem("selectedConversationId");
        if (savedId) {
          const found = fetched.find((c) => c._id === savedId);
          if (found) {
            const friend = found.participants?.find(
              (p) => p._id !== currentUser._id
            );
            if (friend) {
              setSelectedConversation({
                _id: found._id,
                userId: found.isGroup ? "group-id" : friend._id,
                username: found.isGroup ? "Group Chat" : friend.username,
                name: found.isGroup ? found.name : friend.name,
                userProfilePic: found.isGroup ? null : friend.profilePic,
                mock: found.mock,
                isGroup: !!found.isGroup,
              });
            }
          }
        }
      } finally {
        setLoadingConversation(false);
      }
    };

    getConversations();
  }, [currentUser, setConversations, setSelectedConversation]);

  useEffect(() => {
    if (selectedConversation?._id) {
      localStorage.setItem("selectedConversationId", selectedConversation._id);
    }
  }, [selectedConversation]);

  // user search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchTerm.trim()) {
        setSearchedUsers([]);
        return;
      }

      setSearchingUser(true);
      try {
        const res = await api.get(`/users/search/${searchTerm}`);
        const users = res.data.users || [];
        setSearchedUsers(users.filter((u) => u._id !== currentUser._id));
      } catch {
        setSearchedUsers([]);
      } finally {
        setSearchingUser(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm, currentUser._id]);

  const handleUserClick = (user) => {
    const exists = conversations.find(
      (c) =>
        c.participants?.some((p) => p._id === user._id) && !c.mock && !c.isGroup
    );

    if (exists) {
      const friend = exists.participants.find((p) => p._id === user._id);

      setConversations((prev) =>
        prev.map((c) =>
          c._id === exists._id ? { ...c, unreadCount: 0 } : c
        )
      );

      socket.emit("joinConversationRoom", { conversationId: exists._id });

      setSelectedConversation({
        _id: exists._id,
        userId: friend._id,
        username: friend.username,
        name: friend.name,
        userProfilePic: friend.profilePic,
        isGroup: !!exists.isGroup,
      });

      setConversations((prev) => [
        exists,
        ...prev.filter((c) => c._id !== exists._id),
      ]);
    } else {
      const mockId = `mock-${user._id}`;

      const mock = {
        _id: mockId,
        mock: true,
        participants: [
          {
            _id: user._id,
            username: user.username,
            name: user.name,
            profilePic: user.profilePic,
          },
        ],
        unreadCount: 0,
        lastMessage: { text: "" },
      };

      setConversations((prev) => [mock, ...prev]);

      setSelectedConversation({
        _id: mockId,
        userId: user._id,
        username: user.username,
        name: user.name,
        userProfilePic: user.profilePic,
        mock: true,
        isGroup: false,
      });
    }

    setSearchTerm("");
    setSearchedUsers([]);
  };

  return (
    <Box
      position="absolute"
      left="50%"
      transform="translateX(-50%)"
      w={{ base: "100%", md: "100%", lg: "100%" }}
      py={0}
      px={10}
      minH="98vh"
    >
      <Flex
        gap={4}
        flexDirection={{ base: "column", md: "row" }}
        mx="auto"
        py={0}
        h="calc(100vh - 100px)"
        minH="98vh"
      >
        {/* LEFT SIDEBAR */}
        <Flex flex={30} gap={2} flexDirection="column" py={2}>
          <Header />

          <InputGroup>
            {searchTerm.trim() ? (
              <InputLeftElement>
                <IconButton
                  icon={<ChevronLeftIcon />}
                  onClick={() => setSearchTerm("")}
                  variant="ghost"
                />
              </InputLeftElement>
            ) : (
              <InputLeftElement
                pointerEvents="none"
                children={<SearchIcon color="gray.300" />}
              />
            )}
            <Input
              placeholder="Search user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <Flex direction="column" gap={2} h="100%" overflowY="auto">
            {searchTerm.trim() ? (
              searchingUser ? (
                [0, 1, 2].map((i) => (
                  <Flex key={i} gap={4} alignItems="center">
                    <SkeletonCircle size="10" />
                    <Flex w="full" flexDirection="column">
                      <Skeleton h="10px" w="80px" />
                      <Skeleton h="8px" w="90%" />
                    </Flex>
                  </Flex>
                ))
              ) : searchedUsers.length ? (
                searchedUsers.map((u) => (
                  <SearchUserResult
                    key={u._id}
                    user={u}
                    isOnline={onlineUsers.includes(u._id)}
                    onClick={handleUserClick}
                  />
                ))
              ) : (
                <Text textAlign="center" mt={4}>
                  User not found
                </Text>
              )
            ) : (
              <ConversationTabs
                conversations={conversations}
                loading={loadingConversation}
                onlineUsers={onlineUsers}
                onConversationClick={setSelectedConversation}
              />
            )}
          </Flex>
        </Flex>

        {/* RIGHT — CHAT WINDOW */}
        {!selectedConversation?._id ? (
          <Flex flex={70} alignItems="center" justifyContent="center">
            <Text>Select a conversation to start chatting</Text>
          </Flex>
        ) : (
          <MessageContainer />
        )}
      </Flex>
    </Box>
  );
};

export default ChatPage;
