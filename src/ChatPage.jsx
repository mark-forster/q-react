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
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import useIncomingCall from "./hooks/useIncomingCall";

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
import GroupProfileSidebar from "./components/GroupProfileSidebar";
import LeftAppSidebar from "./components/LeftAppSidebar";
import UserProfileSidebar from "./components/UserProfileSidebar";

import { SearchIcon, ChevronLeftIcon } from "@chakra-ui/icons";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

const updateConversationOnNewMessage = (
  prev,
  msg,
  myId,
  selectedConversation
) => {
  const cid = String(msg.conversationId);
  let updated = null;
  const rest = [];

  for (const c of prev) {
    if (String(c._id) === cid) {
      const isFromMe = String(msg.sender) === myId;
      const isActive =
        selectedConversation && String(selectedConversation._id) === cid;

      updated = {
        ...c,
        unreadCount:
          !isFromMe && !isActive
            ? (c.unreadCount || 0) + 1
            : c.unreadCount || 0,
      };
    } else {
      rest.push(c);
    }
  }

  return updated ? [updated, ...rest] : prev;
};

const ChatPage = () => {
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [filterType, setFilterType] = useState("all");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchingUser, setSearchingUser] = useState(false);

  const [conversations, setConversations] = useRecoilState(conversationsAtom);
  const [selectedConversation, setSelectedConversation] = useRecoilState(
    selectedConversationAtom
  );

  const setMessages = useSetRecoilState(messagesAtom);
  const currentUser = useRecoilValue(userAtom);

  const [deletingId, setDeletingId] = useState(null);
  const { socket, onlineUsers } = useSocket();
  const [sendingPreview, setSendingPreview] = useState(null);
  const { incomingCallData, isIncomingCallOpen, answerCall, rejectCall } =
    useIncomingCall(socket);

  //  User Info Sidebar state
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
      case "personal":
        return list.filter((c) => c.isGroup !== true);
      case "unread":
        return list.filter((c) => Number(c.unreadCount || 0) > 0);
      default:
        return list;
    }
  };

  // -------------------------------------------------------------------
  // SOCKET: newMessage
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      const myId = String(currentUser._id);
      const cid = String(msg.conversationId);

      setConversations((prev) =>
        updateConversationOnNewMessage(prev, msg, myId, selectedConversation)
      );

      if (String(msg.sender) === myId) {
        return;
      }

      if (selectedConversation && String(selectedConversation._id) === cid) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };
    const handleConversationUpdated = (payload) => {
      if (!payload?._id) return;

      setConversations((prev) => {
        const updated = prev.map((c) =>
          String(c._id) === String(payload._id)
            ? {
                ...c,
                ...payload,
                lastMessage: payload.lastMessage ?? c.lastMessage,
                updatedAt: payload.updatedAt ?? c.updatedAt,
              }
            : c
        );

        const target = updated.find(
          (c) => String(c._id) === String(payload._id)
        );
        const rest = updated.filter(
          (c) => String(c._id) !== String(payload._id)
        );
        return target ? [target, ...rest] : prev;
      });

      setSelectedConversation((prev) =>
        prev && String(prev._id) === String(payload._id)
          ? { ...prev, ...payload }
          : prev
      );
    };

    //
    const handleConversationCreated = (newConv) => {
      if (!newConv) return;

      setConversations((prev) => {
        //
        const exists = prev.some((c) => c._id === newConv._id);
        if (exists) return prev;

        let updated = [...prev];

        //
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

        //
        return [newConv, ...updated];
      });
    };

    //
    const handleConversationRestored = (conv) => {
      if (!conv || !conv._id) return;

      setConversations((prev) => {
        const exists = prev.some((c) => c._id === conv._id);
        if (exists) return prev;
        return [conv, ...prev];
      });

      toast.success("New chat restored");
    };

    socket.on("callStarted", ({ roomID, callType }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (String(c._id) === String(roomID) && c.isGroup === true) {
            return {
              ...c,
              hasActiveCall: true,
              activeCallType: callType || "audio",
            };
          }
          return c;
        })
      );
    });

    socket.on("roomEnded", ({ roomID }) => {
      setConversations((prev) =>
        prev.map((c) =>
          String(c._id) === String(roomID) && c.isGroup
            ? {
                ...c,
                hasActiveCall: false,
                activeCallType: null,
              }
            : c
        )
      );
    });
    const handleRemovedFromGroup = ({ conversationId }) => {
      // Remove form  conversation list
      setConversations((prev) =>
        prev.filter((c) => String(c._id) !== String(conversationId))
      );

      // selected conversation clear
      setSelectedConversation((prev) =>
        prev && String(prev._id) === String(conversationId) ? null : prev
      );
      setMessages((prev) =>
        selectedConversation &&
        String(selectedConversation._id) === String(conversationId)
          ? []
          : prev
      );

      // check  Sidebar with current data
      setUserProfileSidebarData((prevData) => {
        // sidebar
        if (!prevData) return prevData;

        if (!prevData.isGroup) return prevData;

        if (String(prevData._id) !== String(conversationId)) {
          return prevData;
        }

        setIsUserSidebarOpen(false);
        return null; // sidebar close
      });
    };

    socket.on("removedFromGroup", handleRemovedFromGroup);
    socket.on("leftGroup", handleRemovedFromGroup);
    socket.on("newMessage", handleNewMessage);
    socket.on("conversationCreated", handleConversationCreated);
    socket.on("conversationUpdated", handleConversationUpdated);
    socket.on("conversationRestored", handleConversationRestored);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("conversationCreated", handleConversationCreated);
      socket.off("conversationUpdated", handleConversationUpdated);
      socket.off("conversationRestored", handleConversationRestored);
      socket.off("callStarted");
      socket.off("roomEnded");
      socket.off("removedFromGroup", handleRemovedFromGroup);
      socket.off("leftGroup", handleRemovedFromGroup);
    };
  }, [
    socket,
    selectedConversation,
    setMessages,
    setConversations,
    currentUser?._id, //
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
//  RESTORE LAST CONVERSATION AFTER REFRESH
useEffect(() => {
  if (!conversations.length || !currentUser?._id) return;

  const saved = localStorage.getItem("lastConversationId");
  if (!saved) return;

  const cid = JSON.parse(saved);

  // already selected → skip
  if (String(selectedConversation?._id) === String(cid)) return;

  const conv = conversations.find(
    (c) => String(c._id) === String(cid)
  );
  if (!conv) return;

  if (conv.isGroup) {
    setSelectedConversation({
      _id: conv._id,
      isGroup: true,
      name: conv.name,
      participants: conv.participants,
      userId: "group-id",
      username: "Group Chat",
    });
  } else {
    const friend = conv.participants?.find(
      (p) => String(p._id) !== String(currentUser._id)
    );
    if (!friend) return;

    setSelectedConversation({
      _id: conv._id,
      userId: friend._id,
      username: friend.username,
      name: friend.name || friend.username,
      userProfilePic: friend.profilePic,
      isGroup: false,
    });
  }
}, [conversations, currentUser?._id]);

  // -------------------------------------------------------------------
  // SELECT A CONVERSATION
  // -------------------------------------------------------------------
  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);

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

  // profile sidebar with selected conversation
  useEffect(() => {
    if (!isUserSidebarOpen || !selectedConversation) return;

    // -----------------------
    // GROUP CONVERSATION
    // -----------------------
    if (selectedConversation.isGroup) {
      const fullGroup = conversations.find(
        (c) => String(c._id) === String(selectedConversation._id)
      );

      if (fullGroup) {
        setUserProfileSidebarData({
          ...fullGroup,
          isGroup: true,
        });
      }
      return;
    }

    // -----------------------
    // SINGLE CONVERSATION
    // -----------------------
    const conv = conversations.find(
      (c) => String(c._id) === String(selectedConversation._id)
    );

    if (!conv) return;

    const friend = conv.participants?.find(
      (p) => String(p._id) !== String(currentUser._id)
    );

    if (friend) {
      setUserProfileSidebarData(friend);
    }
  }, [
    selectedConversation,
    isUserSidebarOpen,
    conversations,
    currentUser?._id,
  ]);

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
        !c.isGroup && c.participants?.some((p) => p._id === user._id) && !c.mock
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

      setConversations((prev) => prev.filter((c) => c._id !== conversationId));

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
  // -------------------------------------------------------------------
  const handleOpenUserProfile = (user) => {
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
          bg={useColorModeValue("#F3F2F1", "#102a43")}
          borderRight="1px solid"
          borderColor={useColorModeValue("gray.200", "gray.700")}
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
          overflow="hidden"
          gap={3}
          bg={useColorModeValue("white", "#162b3a")}
          borderRight="1px solid"
          borderColor={useColorModeValue("gray.200", "gray.700")}
        >
          {filterType === "groups" && (
            <Button
              size="sm"
              bg={useColorModeValue("#23ADE3", "#3FB07B")}
              onClick={openGroupCreate}
            >
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
              <Flex
                flex={1}
                align="center"
                justify="center"
                bg={useColorModeValue("gray.50", "#0b1f2a")}
              >
                <Text
                  color={useColorModeValue("gray.500", "gray.400")}
                  fontSize="lg"
                >
                  {" "}
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
          {isUserSidebarOpen &&
            userProfileSidebarData &&
            (userProfileSidebarData?.isGroup ? (
              <GroupProfileSidebar
                group={userProfileSidebarData}
                onClose={handleCloseUserProfile}
              />
            ) : (
              <UserProfileSidebar
                user={userProfileSidebarData}
                onClose={handleCloseUserProfile}
                isOnline={onlineUsers.includes(
                  String(userProfileSidebarData._id)
                )}
              />
            ))}
        </Flex>
      </Flex>

      <GroupCreateModal
        isOpen={isGroupCreateOpen}
        onClose={closeGroupCreate}
        onCreated={handleGroupCreated}
      />
      {/*  INCOMING CALL MODAL (GLOBAL) */}
      {incomingCallData && (
        <Modal isOpen={isIncomingCallOpen} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              {incomingCallData.callType.toUpperCase()} Call
            </ModalHeader>
            <ModalBody>
              <Text>
                <b>{incomingCallData.name}</b> is calling…
              </Text>
            </ModalBody>
            <ModalFooter gap={3}>
              <Button colorScheme="red" onClick={rejectCall}>
                Reject
              </Button>
              <Button
                colorScheme="green"
                onClick={() => answerCall({ currentUser })}
              >
                Answer
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
};

export default ChatPage;
