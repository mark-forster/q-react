// ChatPage.jsx
import {
  Box, Flex, Text, Input, Skeleton, SkeletonCircle, InputGroup,
  InputLeftElement, IconButton,
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import MessageContainer from "./components/MessageContainer";
import axios from "axios";
import { useRecoilState, useRecoilValue } from "recoil";
import { conversationsAtom, selectedConversationAtom, messagesAtom } from "./atoms/messageAtom";
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
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedUsers, setSearchedUsers] = useState([]);
  const currentUser = useRecoilValue(userAtom);
  const setMessages = useRecoilState(messagesAtom)[1];

  const { socket, onlineUsers } = useSocket();

  // mark seen when switching/opening a conversation
  useEffect(() => {
    const updateSeenStatus = async () => {
      if (selectedConversation?._id && currentUser?._id) {
        try {
          await api.put(`/messages/seen/${selectedConversation._id}`);
        } catch (err) {
          console.error("Failed to update seen status:", err);
        }
      }
    };
    updateSeenStatus();
  }, [selectedConversation, currentUser]);

  useEffect(() => {
    if (!socket) return;

    const handleConversationCreated = (newConversation) => {
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === newConversation._id);
        if (!exists) {
          toast.success("New conversation started!");
          const seeded = { ...newConversation, unreadCount: newConversation.unreadCount ?? 1 };
          return [seeded, ...prev];
        }
        return prev;
      });
    };

    const handleConversationPermanentlyDeleted = ({ conversationId }) => {
      setConversations((prev) => prev.filter((conv) => conv._id !== conversationId));
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      toast.success("Conversation has been permanently deleted.");
    };

    const handleMessageUpdated = (data) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === data.messageId ? { ...msg, text: data.newText } : msg))
      );
    };

    const handleNewMessage = (message) => {
      // normalize
      const msgSender = String(
        (typeof message.sender === "object" && message.sender?._id) ||
        message.sender ||
        message.senderId ||
        ""
      );

      setConversations((prev) => {
        const next = prev.map((c) => {
          if (c._id !== String(message.conversationId)) return c;

          const isOpened = selectedConversation?._id === c._id;
          const nextUnread =
            isOpened || msgSender === String(currentUser._id)
              ? 0
              : (c.unreadCount || 0) + 1;

          return {
            ...c,
            lastMessage: message,
            unreadCount: nextUnread,
          };
        });

        // move to top
        const active = next.find((c) => c._id === String(message.conversationId));
        const others = next.filter((c) => c._id !== String(message.conversationId));
        return active ? [active, ...others] : next;
      });

      if (selectedConversation?._id === String(message.conversationId)) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleMessagesSeen = ({ conversationId, userId }) => {
      const uid = String(userId);

      if (selectedConversation?._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            seenBy: Array.from(new Set([...(m.seenBy || []).map(String), uid])),
          }))
        );
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c._id !== conversationId || !c.lastMessage) return c;
          const updatedSeenBy = Array.from(
            new Set([...(c.lastMessage.seenBy || []).map(String), uid])
          );
          return { ...c, lastMessage: { ...c.lastMessage, seenBy: updatedSeenBy } };
        })
      );
    };

    socket.on("conversationCreated", handleConversationCreated);
    socket.on("conversationPermanentlyDeleted", handleConversationPermanentlyDeleted);
    socket.on("messageUpdated", handleMessageUpdated);
    socket.on("newMessage", handleNewMessage);
    socket.on("messagesSeen", handleMessagesSeen);

    return () => {
      socket.off("conversationCreated", handleConversationCreated);
      socket.off("conversationPermanentlyDeleted", handleConversationPermanentlyDeleted);
      socket.off("messageUpdated", handleMessageUpdated);
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesSeen", handleMessagesSeen);
    };
  }, [socket, selectedConversation, setConversations, setMessages, currentUser]);

  // initial fetch
  useEffect(() => {
    const getConversations = async () => {
      try {
        const { data } = await api.get("/messages/conversations");
        let fetched = data.conversations || data;

        fetched = fetched.filter(
          (conv) => !(conv.deletedBy && conv.deletedBy.includes(currentUser._id))
        );

        fetched.sort((a, b) => {
          const aUpdatedAt = a.lastMessage?.updatedAt || a.createdAt;
          const bUpdatedAt = b.lastMessage?.updatedAt || b.createdAt;
          if (!aUpdatedAt && !bUpdatedAt) return 0;
          if (!aUpdatedAt) return 1;
          if (!bUpdatedAt) return -1;
          return new Date(bUpdatedAt) - new Date(aUpdatedAt);
        });

        setConversations(fetched);

        const storedSelectedId = localStorage.getItem("selectedConversationId");
        if (storedSelectedId) {
          const storedConversation = fetched.find((c) => c._id === storedSelectedId);
          if (storedConversation && storedConversation.participants?.length > 0) {
            const friend = storedConversation.participants.find((p) => p._id !== currentUser._id);
            setSelectedConversation({
              _id: storedConversation._id,
              userId: friend?._id,
              username: friend?.username,
              name: friend?.name,
              userProfilePic: friend?.profilePic,
              mock: storedConversation.mock,
              isGroup: !!storedConversation.isGroup,
            });
          }
        }
      } catch (err) {
        console.log(err.message);
      } finally {
        setLoadingConversation(false);
      }
    };
    getConversations();
  }, [setConversations, setSelectedConversation, currentUser]);

  useEffect(() => {
    if (selectedConversation?._id) {
      localStorage.setItem("selectedConversationId", selectedConversation._id);
    }
  }, [selectedConversation]);

  // search
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (searchTerm.trim()) {
        setSearchingUser(true);
        setSearchedUsers([]);
        try {
          const response = await api.get(`/users/search/${searchTerm}`);
          if (response.data.errorMessage) {
            toast.error(response.data.errorMessage);
            setSearchedUsers([]);
            return;
          }
          const foundUsers = response.data.users;
          const filtered = foundUsers.filter((u) => u._id !== currentUser._id);
          setSearchedUsers(filtered.length ? filtered : []);
        } catch (err) {
          setSearchedUsers([]);
          console.error("An error occurred while searching for the user:", err);
          toast.error("An error occurred while searching for the user");
        } finally {
          setSearchingUser(false);
        }
      } else {
        setSearchedUsers([]);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [searchTerm, currentUser]);

  const handleUserClick = (foundUser) => {
    const conversationAlreadyExists = conversations.find(
      (conversation) =>
        !conversation.mock &&
        conversation.participants?.find((p) => p._id === foundUser._id)
    );

    if (conversationAlreadyExists) {
      setSelectedConversation({
        _id: conversationAlreadyExists._id,
        userId: foundUser._id,
        username: foundUser.username,
        name: foundUser.name,
        userProfilePic: foundUser.profilePic,
        mock: false,
        isGroup: !!conversationAlreadyExists.isGroup,
      });

      // optimistic unread reset + ensure room join
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationAlreadyExists._id ? { ...c, unreadCount: 0 } : c
        )
      );
      socket?.emit("joinConversationRoom", { conversationId: conversationAlreadyExists._id });

      setConversations((prev) => {
        const otherConversations = prev.filter(
          (c) => c._id !== conversationAlreadyExists._id
        );
        return [conversationAlreadyExists, ...otherConversations];
      });
    } else {
      const mockConversation = {
        mock: true,
        lastMessage: { text: "", sender: "" },
        _id: `mock-${foundUser._id}`,
        participants: [{ _id: foundUser._id, username: foundUser.username, name: foundUser.name, profilePic: foundUser.profilePic }],
        unreadCount: 0,
      };

      setConversations((prev) => [mockConversation, ...prev]);
      setSelectedConversation({
        _id: mockConversation._id,
        userId: foundUser._id,
        name: foundUser.name,
        username: foundUser.username,
        userProfilePic: foundUser.profilePic,
        updatedAt: foundUser.updatedAt,
        mock: true,
        isGroup: false,
      });
    }
    setSearchedUsers([]);
    setSearchTerm("");
  };

  const handleBackClick = () => {
    setSearchTerm("");
    setSearchedUsers([]);
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!conversationId) return;
    try {
      const response = await api.delete(`/messages/conversation/${conversationId}`);
      if (response.status === 200) {
        setConversations((prev) => prev.filter((c) => c._id !== conversationId));
        if (selectedConversation?._id === conversationId) {
          setSelectedConversation(null);
          setMessages([]);
        }
        toast.success("Conversation deleted successfully.");
      } else {
        toast.error("Failed to delete the conversation.");
      }
    } catch (err) {
      console.error("Error deleting conversation:", err);
      toast.error("An error occurred while deleting the conversation.");
    }
  };

  return (
    <Box position="absolute" left="50%" transform="translateX(-50%)" w={{ base: "100%", md: "100%", lg: "100%" }} py={0} px={10} minH="98vh">
      <Flex gap={4} flexDirection={{ base: "column", md: "row" }} maxW={{ sm: "400px", md: "full" }} mx="auto" py={0} h="calc(100vh - 100px)" minH="98vh">
        <Flex flex={30} gap={2} flexDirection="column" maxW={{ sm: "250px", md: "full" }} mx="auto" py={2}>
          <Header />
          <InputGroup>
            {searchTerm.trim() ? (
              <InputLeftElement>
                <IconButton aria-label="Back" icon={<ChevronLeftIcon />} onClick={handleBackClick} variant="ghost" />
              </InputLeftElement>
            ) : (
              <InputLeftElement pointerEvents="none" children={<SearchIcon color="gray.300" />} />
            )}
            <Input placeholder="Search user" onChange={(e) => setSearchTerm(e.target.value)} value={searchTerm} pl={searchTerm.trim() ? "45px" : "40px"} />
          </InputGroup>

          <Flex direction="column" gap={2} h="100%" overflowY="auto">
            {searchTerm.trim() ? (
              searchingUser ? (
                [0, 1, 2, 3, 4].map((_, i) => (
                  <Flex key={i} gap={4} alignItems="center" p="1" borderRadius="md">
                    <SkeletonCircle size="10" />
                    <Flex w="full" flexDirection="column" gap={3}>
                      <Skeleton h="10px" w="80px" />
                      <Skeleton h="8px" w="90%" />
                    </Flex>
                  </Flex>
                ))
              ) : searchedUsers.length > 0 ? (
                searchedUsers.map((user) => {
                  const isOnline = onlineUsers.includes(user._id);
                  return <SearchUserResult key={user._id} user={user} onClick={handleUserClick} isOnline={isOnline} />;
                })
              ) : (
                <Text textAlign="center" mt={4}>User Not found</Text>
              )
            ) : (
              <ConversationTabs
                conversations={conversations}
                loading={loadingConversation}
                onlineUsers={onlineUsers}
                onConversationClick={setSelectedConversation}
                onDelete={handleDeleteConversation}
              />
            )}
          </Flex>
        </Flex>

        {!selectedConversation?._id ? (
          <Flex flex={70} borderRadius="md" p={2} flexDir="column" alignItems="center" justifyContent="center" h="100%">
            <Text fontSize={20}>Click a conversation to start chatting</Text>
          </Flex>
        ) : (
          <MessageContainer />
        )}
      </Flex>
    </Box>
  );
};

export default ChatPage;
