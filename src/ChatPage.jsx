// ChatPage.jsx — FINAL UPDATED (Fix duplicate conversation when search user + send first message)

import {
  Box,
  Flex,
  Text,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Skeleton,
  SkeletonCircle,
  IconButton,
  useDisclosure,
} from "@chakra-ui/react";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

import MessageContainer from "./components/MessageContainer";
import ConversationList from "./components/ConversationList";
import SearchUserResult from "./components/SearchUserResult";

import axios from "axios";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";

import {
  conversationsAtom,
  selectedConversationAtom,
  messagesAtom,
} from "./atoms/messageAtom";

import userAtom from "./atoms/userAtom";
import { useSocket } from "./context/SocketContext";

import GroupCreateModal from "./components/GroupCreateModal";
import GroupProfileModal from "./components/GroupProfileModal";
import LeftAppSidebar from "./components/LeftAppSidebar";
import UserProfileSidebar from "./components/UserProfileSidebar";

import { SearchIcon, ChevronLeftIcon } from "@chakra-ui/icons";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

const ChatPage = () => {
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [filterType, setFilterType] = useState("all");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchingUser, setSearchingUser] = useState(false);
useEffect(() => {
    setSelectedConversation(null);
    setMessages([]);
  }, []);
  const [conversations, setConversations] = useRecoilState(conversationsAtom);
  const [selectedConversation, setSelectedConversation] = useRecoilState(
    selectedConversationAtom
  );

  const setMessages = useSetRecoilState(messagesAtom);
  const currentUser = useRecoilValue(userAtom);

  const [deletingId, setDeletingId] = useState(null);
  const { socket, onlineUsers } = useSocket();
  const [sendingPreview, setSendingPreview] = useState(null);

  // 🔹 User Info Sidebar state
  const [userProfileSidebarData, setUserProfileSidebarData] = useState(null);
  const [isUserSidebarOpen, setIsUserSidebarOpen] = useState(false);

  const {
    isOpen: isGroupCreateOpen,
    onOpen: openGroupCreate,
    onClose: closeGroupCreate,
  } = useDisclosure();

  const {
    isOpen: isGroupProfileOpen,
    onOpen: openGroupProfile,
    onClose: closeGroupProfile,
  } = useDisclosure();

  // -------------------------------------------------------------------
  // FILTER CONVERSATIONS
  // -------------------------------------------------------------------
  const filterConversations = (list) => {
    if (!list) return [];
    switch (filterType) {
      case "groups":
        return list.filter((c) => c.isGroup);
      case "unread":
        return list.filter((c) => Number(c.unreadCount || 0) > 0);
      default:
        return list;
    }
  };

  // -------------------------------------------------------------------
  // SOCKET: newMessage (NO duplicate push) + conversationRestored
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      const cid = String(msg.conversationId);

      // If user is viewing that conversation -> append
      if (selectedConversation && String(selectedConversation._id) === cid) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev; // prevent duplicates
          return [...prev, msg];
        });
      }

      // Refresh conversation list automatically
      api.get("/messages/conversations").then((res) => {
        let updated = res.data.conversations || [];

        // Sort by last updated time
        updated.sort((a, b) => {
          const t1 = new Date(a.lastMessage?.updatedAt || 0);
          const t2 = new Date(b.lastMessage?.updatedAt || 0);
          return t2 - t1;
        });

        setConversations(updated);
      });
    };

    // ⭐ FIX HERE: remove mock conversation when real conversationCreated is received
    const handleConversationCreated = (newConv) => {
      if (!newConv) return;

      setConversations((prev) => {
        // အကယ်၍ အပြီးသတ် real conversation လာပြီးသားဆိုရင် ထပ်မထည့်
        const exists = prev.some((c) => c._id === newConv._id);
        if (exists) return prev;

        let updated = [...prev];

        // ✅ DM ဖြစ်ရင် အဟောင်း mock chat ကို ဖယ်ထုတ်မယ်
        if (!newConv.isGroup && currentUser?._id) {
          const myId = String(currentUser._id);
          const friend = (newConv.participants || []).find(
            (p) => String(p._id) !== myId
          );

          if (friend) {
            const friendId = String(friend._id);
            updated = updated.filter((c) => {
              if (!c?.mock) return true;
              const first = Array.isArray(c.participants)
                ? c.participants[0]
                : null;
              if (!first?._id) return true;
              return String(first._id) !== friendId;
            });
          }
        }

        // Real conversation ကို သန့်သန့် အပေါ်ဆုံး ထည့်
        return [newConv, ...updated];
      });
    };

    // ⭐️ NEW: Telegram-style restore when other side sends message
    const handleConversationRestored = (conv) => {
      if (!conv || !conv._id) return;

      setConversations((prev) => {
        const exists = prev.some((c) => c._id === conv._id);
        if (exists) return prev;
        return [conv, ...prev];
      });

      toast.success("New chat restored");
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("conversationCreated", handleConversationCreated);
    socket.on("conversationRestored", handleConversationRestored);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("conversationCreated", handleConversationCreated);
      socket.off("conversationRestored", handleConversationRestored);
    };
  }, [
    socket,
    selectedConversation,
    setMessages,
    setConversations,
    currentUser?._id, // ⭐ current user id ကို dep ထဲထည့်ထား။
  ]);

  // -------------------------------------------------------------------
  // FETCH ALL CONVERSATIONS
  // -------------------------------------------------------------------
  useEffect(() => {
    const getConvs = async () => {
      try {
        const { data } = await api.get("/messages/conversations");
        let fetched = data.conversations || [];

        // Remove conversations deleted by this user
        fetched = fetched.filter(
          (c) => !(c.deletedBy && c.deletedBy.includes(currentUser._id))
        );

        fetched.sort((a, b) => {
          const t1 = new Date(a.lastMessage?.updatedAt || a.createdAt);
          const t2 = new Date(b.lastMessage?.updatedAt || b.createdAt);
          return t2 - t1;
        });

        setConversations(fetched);
      } finally {
        setLoadingConversation(false);
      }
    };

    getConvs();
  }, []);

  // -------------------------------------------------------------------
  // SELECT A CONVERSATION
  // -------------------------------------------------------------------
  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    setMessages([]);

    setIsUserSidebarOpen(false);
    setUserProfileSidebarData(null);

    // move to top
    setConversations((prev) => {
      const arr = [...prev];
      const idx = arr.findIndex((c) => c._id === conv._id);
      if (idx !== -1) {
        const item = arr.splice(idx, 1)[0];
        arr.unshift(item);
      }
      return arr;
    });
  };

  // -------------------------------------------------------------------
  // SEARCH USERS
  // -------------------------------------------------------------------
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!searchTerm.trim()) {
        setSearchedUsers([]);
        return;
      }

      setSearchingUser(true);

      try {
        const r = await api.get(`/users/search/${searchTerm}`);
        const users = r.data.users || [];
        setSearchedUsers(users.filter((u) => u._id !== currentUser._id));
      } catch {
        setSearchedUsers([]);
      } finally {
        setSearchingUser(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [searchTerm]);

  // -------------------------------------------------------------------
  // CLICK USER -> START OR OPEN CONVERSATION
  // -------------------------------------------------------------------
  const handleUserClick = (user) => {
    const exists = conversations.find(
      (c) =>
        !c.isGroup &&
        c.participants?.some((p) => p._id === user._id) &&
        !c.mock
    );

    if (exists) {
      const friend = exists.participants.find((p) => p._id === user._id);

      setSelectedConversation({
        _id: exists._id,
        userId: friend._id,
        username: friend.username,
        name: friend.name,
        userProfilePic: friend.profilePic,
        isGroup: false,
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
        isGroup: false,
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

      // ⭐ FIX HERE: အဟောင်း mock (ဒီ user အတွက်) ရှိရင် ဖျက်ပြီး အသစ်တစ်ခုပဲ ထားမယ်
      setConversations((prev) => {
        const filtered = prev.filter(
          (c) => !(c.mock && c.participants?.[0]?._id === user._id)
        );
        return [mock, ...filtered];
      });

      setSelectedConversation({
        _id: mockId,
        isGroup: false,
        userId: user._id,
        username: user.username,
        name: user.name,
        userProfilePic: user.profilePic,
        mock: true,
      });
    }

    setSearchTerm("");
    setSearchedUsers([]);
  };

  // -------------------------------------------------------------------
  // GROUP CREATED → update list + auto open
  // -------------------------------------------------------------------
  const handleGroupCreated = (conversation) => {
    if (!conversation) return;

    setConversations((prev) => [conversation, ...prev]);

    setSelectedConversation({
      _id: conversation._id,
      isGroup: true,
      name: conversation.name,
      participants: conversation.participants,
      userId: "group-id",
      username: "Group Chat",
    });
  };

  // -------------------------------------------------------------------
  // DELETE CONVERSATION (for me)
  // -------------------------------------------------------------------
  const handleDeleteConversation = async (conversationId) => {
    setDeletingId(conversationId);
    try {
      await api.delete(`/messages/conversation/${conversationId}`);

      setConversations((prev) =>
        prev.filter((c) => c._id !== conversationId)
      );

      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }

      setIsUserSidebarOpen(false);
      setUserProfileSidebarData(null);

      toast.success("Conversation deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete conversation");
    } finally {
      setDeletingId(null);
    }
  };

  // -------------------------------------------------------------------
  // OPEN USER PROFILE (Telegram-style Sidebar)
  // -------------------------------------------------------------------
  const handleOpenUserProfile = (user) => {
    if (!user) return;
    setUserProfileSidebarData(user);
    setIsUserSidebarOpen(true);
  };

  const handleCloseUserProfile = () => {
    setIsUserSidebarOpen(false);
  };

  // -------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------
  return (
    <Box w="100%" h="100%" overflow="hidden">
      <Flex h="100%" overflow="hidden">
        {/* LEFT SIDEBAR */}
        <Flex
          w="72px"
          bg="#F3F2F1"
          borderRight="1px solid #ddd"
          justify="center"
          py={4}
        >
          <LeftAppSidebar onChangeFilter={setFilterType} />
        </Flex>

        {/* LEFT PANEL (Conversation list) */}
        <Flex
          flex={30}
          direction="column"
          p={4}
          borderRight="1px solid #e5e5e5"
          overflow="hidden"
          gap={3}
        >
          {filterType === "groups" && (
            <Button size="sm" colorScheme="purple" onClick={openGroupCreate}>
              Create Group
            </Button>
          )}

          <InputGroup>
            {searchTerm ? (
              <InputLeftElement>
                <IconButton
                  icon={<ChevronLeftIcon />}
                  variant="ghost"
                  onClick={() => setSearchTerm("")}
                />
              </InputLeftElement>
            ) : (
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.300" />
              </InputLeftElement>
            )}

            <Input
              placeholder="Search user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <Flex direction="column" gap={2} mt={2} overflowY="auto">
            {searchTerm ? (
              searchingUser ? (
                [0, 1, 2].map((i) => (
                  <Flex key={i} gap={4} align="center">
                    <SkeletonCircle size="10" />
                    <Flex flex={1} direction="column">
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
                <Text textAlign="center">User not found</Text>
              )
            ) : (
              <ConversationList
                conversations={filterConversations(conversations)}
                loading={loadingConversation}
                onlineUsers={onlineUsers}
                onDelete={handleDeleteConversation}
                onOpenGroupProfile={openGroupProfile}
                onOpenUserProfile={handleOpenUserProfile}
                deletingId={deletingId}
              />
            )}
          </Flex>
        </Flex>

        {/* RIGHT PANEL (Messages + User Info Sidebar) */}
        <Flex flex={70} overflow="hidden">
          {/* Messages Area */}
          <Flex
            flex={isUserSidebarOpen ? 65 : 100}
            overflow="hidden"
            borderRight={isUserSidebarOpen ? "1px solid #e5e5e5" : "none"}
          >
            {!selectedConversation?._id ? (
              <Flex flex={1} align="center" justify="center">
                <Text color="gray.500" fontSize="lg">
                  Select a conversation to start chatting
                </Text>
              </Flex>
            ) : (
              <MessageContainer
                onConversationSelect={handleSelectConversation}
                sendingPreview={sendingPreview}
                setSendingPreview={setSendingPreview}
              />
            )}
          </Flex>

          {/* Telegram-style User Info Sidebar */}
          {isUserSidebarOpen && userProfileSidebarData && (
            <UserProfileSidebar
              user={userProfileSidebarData}
              onClose={handleCloseUserProfile}
              isOnline={onlineUsers.includes(
                String(userProfileSidebarData._id)
              )}
            />
          )}
        </Flex>
      </Flex>

      <GroupCreateModal
        isOpen={isGroupCreateOpen}
        onClose={closeGroupCreate}
        onCreated={handleGroupCreated}
      />

      {selectedConversation?.isGroup && (
        <GroupProfileModal
          isOpen={isGroupProfileOpen}
          onClose={closeGroupProfile}
          group={conversations.find(
            (c) => c._id === selectedConversation._id
          )}
        />
      )}
    </Box>
  );
};

export default ChatPage;
