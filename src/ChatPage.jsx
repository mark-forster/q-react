import {
  Box,
  Flex,
  Text,
  useColorModeValue,
  Input,
  Skeleton,
  SkeletonCircle,
  Avatar,
  InputGroup,
  InputLeftElement,
  IconButton,
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import Conversation from "./components/Conversation";
import toast from "react-hot-toast";
import MessageContainer from "./components/MessageContainer";
import axios from "axios";
import { useRecoilState, useRecoilValue } from "recoil";
import { conversationsAtom, selectedConversationAtom } from "./atoms/messageAtom";
import userAtom from "./atoms/userAtom";
import { useSocket } from "./context/SocketContext";
import { SearchIcon, ChevronLeftIcon } from '@chakra-ui/icons';
import Header from "./components/Header";

// Create an axios instance here to use VITE_API_URL consistently.
const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
    baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
    withCredentials: true,
});

// A component similar to Conversation for search results
const SearchUserResult = ({ user, onClick, isOnline }) => {
  const bg = useColorModeValue("gray.50", "gray.700");
  const hoverBg = useColorModeValue("gray.100", "gray.600");

  return (
    <Flex
      gap={4}
      alignItems={"center"}
      p={"1"}
      _hover={{
        cursor: "pointer",
        bg: hoverBg,
      }}
      onClick={() => onClick(user)}
      borderRadius={"md"}
      bg={bg}
    >
      <Box position="relative">
        <Avatar size={"md"} src={user.profilePic} />
        {isOnline && (
          <Box
            position="absolute"
            bottom="0px"
            right="0px"
            p="1"
            bg="green.500"
            borderRadius="full"
            border="2px solid"
            borderColor={useColorModeValue("white", "gray.800")}
          />
        )}
      </Box>
      <Flex w={"full"} flexDirection={"column"}>
        <Text fontWeight={700}>
          {user.name}
        </Text>
        <Text fontSize={"sm"}>
          {user.username}
        </Text>
      </Flex>
    </Flex>
  );
};

const ChatPage = () => {
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [searchingUser, setSearchingUser] = useState(false);
  const [conversations, setConversations] = useRecoilState(conversationsAtom);
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedUsers, setSearchedUsers] = useState([]);
  const currentUser = useRecoilValue(userAtom);
  const { socket, onlineUsers } = useSocket();

  useEffect(() => {
    const getConversations = async () => {
      try {
        const response = await api.get("/messages/conversations"); // axios.get() -> api.get()
        let fetchedConversations = response.data.conversations;

        // Sort conversations by the last message's timestamp (newest at the top)
        fetchedConversations.sort((a, b) => {
          const aUpdatedAt = a.lastMessage?.updatedAt;
          const bUpdatedAt = b.lastMessage?.updatedAt;

          if (!aUpdatedAt && !bUpdatedAt) return 0;
          if (!aUpdatedAt) return 1;
          if (!bUpdatedAt) return -1;

          return new Date(bUpdatedAt) - new Date(aUpdatedAt);
        });

        setConversations(fetchedConversations);

        const storedSelectedId = localStorage.getItem("selectedConversationId");
        if (storedSelectedId) {
          const storedConversation = fetchedConversations.find(
            (conv) => conv._id === storedSelectedId
          );
          if (storedConversation && storedConversation.participants?.length > 0) {
            setSelectedConversation({
              _id: storedConversation._id,
              userId: storedConversation.participants[0]._id,
              username: storedConversation.participants[0].username,
              name: storedConversation.participants[0].name,
              userProfilePic: storedConversation.participants[0].profilePic,
              mock: storedConversation.mock,
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
  }, [setConversations, setSelectedConversation]);

  useEffect(() => {
    if (selectedConversation?._id) {
      localStorage.setItem("selectedConversationId", selectedConversation._id);
    }
  }, [selectedConversation]);

  // Using a debounce function to prevent multiple API calls while typing
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim()) { // Start search only if searchTerm exists
        setSearchingUser(true);
        setSearchedUsers([]); // Clear old results before starting a new search
        try {
          // Changed according to the API endpoint provided by the user
          const response = await api.get(`/users/search/${searchTerm}`); // axios.get() -> api.get()
          if (response.data.errorMessage) {
            toast.error(response.data.errorMessage);
            setSearchedUsers([]);
            return;
          }
          const foundUsers = response.data.users;

          // Check if the user is searching for themselves
          const filteredUsers = foundUsers.filter(user => user._id !== currentUser._id);

          if (filteredUsers.length === 0) {
            setSearchedUsers([]);
            return;
          }
          setSearchedUsers(filteredUsers);
        } catch (err) {
          setSearchedUsers([]);
          console.error("An error occurred while searching for the user:", err);
          toast.error("An error occurred while searching for the user");
        } finally {
          setSearchingUser(false);
        }
      } else {
        setSearchedUsers([]); // Clear results if the search term is empty
      }
    }, 500); // Wait 500ms before making the API call

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentUser]);

  const handleUserClick = (foundUser) => {
    // 1. Check if a conversation with this user already exists
    const conversationAlreadyExists = conversations.find(
      (conversation) =>
        !conversation.mock && conversation.participants?.find(p => p._id === foundUser._id)
    );

    if (conversationAlreadyExists) {
      // Select the existing conversation
      setSelectedConversation({
        _id: conversationAlreadyExists._id,
        userId: foundUser._id,
        username: foundUser.username,
        name: foundUser.name,
        userProfilePic: foundUser.profilePic,
        mock: false,
      });

      // Move the conversation to the top of the list
      setConversations(prev => {
        const otherConversations = prev.filter(c => c._id !== conversationAlreadyExists._id);
        return [conversationAlreadyExists, ...otherConversations];
      });
    } else {
      // 2. Create a new mock conversation
      const mockConversation = {
        mock: true,
        lastMessage: {
          text: "",
          sender: "",
        },
        _id: `mock-${foundUser._id}`,
        participants: [
          {
            _id: foundUser._id,
            username: foundUser.username,
            name: foundUser.name,
            profilePic: foundUser.profilePic,
          },
        ],
      };

      // Add the new conversation to the top of the list
      setConversations((prevConvs) => [mockConversation, ...prevConvs]);
      setSelectedConversation({
        _id: mockConversation._id,
        userId: foundUser._id,
        name: foundUser.name,
        username: foundUser.username,
        userProfilePic: foundUser.profilePic,
        updatedAt: foundUser.updatedAt,
        mock: true,
      });
    }
    setSearchedUsers([]); // Clear search results after starting a conversation
    setSearchTerm(""); // Also clear the search input
  };

  // This useEffect listens for new messages from the socket.
  // We use the functional update form of `setConversations` to avoid stale state issues.
  useEffect(() => {
    socket?.on("newMessage", (message) => {
      // Functional state update ensures we're always working with the latest conversation list.
      setConversations(prevConvs => {
        let conversationFound = false;

        const updatedConversations = prevConvs.map((conversation) => {
          if (conversation._id === message.conversationId) {
            conversationFound = true;
            return {
              ...conversation,
              lastMessage: {
                ...conversation.lastMessage,
                text: message.text,
                sender: message.sender,
                // Update the timestamp to move it to the top
                updatedAt: new Date().toISOString(),
              },
            };
          }
          return conversation;
        });

        // If an existing conversation was updated, move it to the top.
        if (conversationFound) {
          const updatedConversation = updatedConversations.find(
            (conv) => conv._id === message.conversationId
          );
          const otherConversations = updatedConversations.filter(
            (conv) => conv._id !== message.conversationId
          );
          return [updatedConversation, ...otherConversations];
        } else {
          // If the message is for a new conversation not yet in the list, fetch it.
          const getNewConversation = async () => {
            try {
              const response = await api.get(`/messages/conversation/${message.conversationId}`); // axios.get() -> api.get()
              if (response.data) {
                // We must use a nested state update to avoid the stale state problem.
                setConversations((latestConvs) => [response.data.conversation, ...latestConvs]);
              }
            } catch (err) {
              toast.error("Failed to get a new conversation");
            }
          };
          getNewConversation();
        }
        return prevConvs; // Return the previous state if no changes are made synchronously.
      });
    });

    socket?.on("messagesSeen", ({ conversationId }) => {
      setConversations((prevConvs) =>
        prevConvs.map((conversation) => {
          if (conversation._id === conversationId) {
            return {
              ...conversation,
              lastMessage: {
                ...conversation.lastMessage,
                seen: true,
              },
            };
          }
          return conversation;
        })
      );
    });

    return () => {
      socket?.off("newMessage");
      socket?.off("messagesSeen");
    }
  }, [socket, setConversations]); // Removed conversations from dependencies to avoid infinite loops and stale state.

  const handleBackClick = () => {
    setSearchTerm("");
    setSearchedUsers([]);
  };

  return (
    <>
      <Box
        position={"absolute"}
        left={"50%"}
        transform={"translateX(-50%)"}
        w={{ base: "100%", md: "100%", lg: "100%" }}
        py={0}
        px={10}
      >
        <Flex
          gap={4}
          flexDirection={{ base: "column", md: "row" }}
          maxW={{
            sm: "400px",
            md: "full",
          }}
          mx={"auto"}
          h="calc(100vh - 100px)"
        >
          <Flex
            flex={30}
            gap={2}
            flexDirection={"column"}
            maxW={{ sm: "250px", md: "full" }}
            mx={"auto"}
          >
            <Flex
              direction={"column"}
              gap={2}
              py={2}
              px={4}
              borderBottom="1px solid"
              borderColor={useColorModeValue("red.200", "gray.600")}
            >
              <Header />
              <InputGroup>
                {searchTerm.trim() ? (
                  <InputLeftElement>
                    <IconButton
                      aria-label="Back"
                      icon={<ChevronLeftIcon />}
                      onClick={handleBackClick}
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
                  placeholder='Search user'
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm}
                  pl={searchTerm.trim() ? "45px" : "40px"}
                />
              </InputGroup>
            </Flex>
            <Flex
              direction={"column"}
              gap={2}
              p={2}
              h="100%"
              overflowY="auto"
            >
              {searchTerm.trim() ? (
                searchingUser ? (
                  [0, 1, 2, 3, 4].map((_, i) => (
                    <Flex key={i} gap={4} alignItems={"center"} p={"1"} borderRadius={"md"}>
                      <Box>
                        <SkeletonCircle size={"10"} />
                      </Box>
                      <Flex w={"full"} flexDirection={"column"} gap={3}>
                        <Skeleton h={"10px"} w={"80px"} />
                        <Skeleton h={"8px"} w={"90%"} />
                      </Flex>
                    </Flex>
                  ))
                ) : (
                  searchedUsers.length > 0 ? (
                    searchedUsers.map((user) => {
                      const isOnline = onlineUsers.includes(user._id);
                      return (
                        <SearchUserResult
                          key={user._id}
                          user={user}
                          onClick={handleUserClick}
                          isOnline={isOnline}
                        />
                      );
                    })
                  ) : (
                    <Text textAlign="center" mt={4}>
                      User Not found
                    </Text>
                  )
                )
              ) : (
                loadingConversation ? (
                  [0, 1, 2, 3, 4].map((_, i) => (
                    <Flex key={i} gap={4} alignItems={"center"} p={"1"} borderRadius={"md"}>
                      <Box>
                        <SkeletonCircle size={"10"} />
                      </Box>
                      <Flex w={"full"} flexDirection={"column"} gap={3}>
                        <Skeleton h={"10px"} w={"80px"} />
                        <Skeleton h={"8px"} w={"90%"} />
                      </Flex>
                    </Flex>
                  ))
                ) : (
                  conversations.map((conversation) => {
                    if (!conversation?.participants || conversation.participants.length === 0) {
                      return null;
                    }
                    const isOnline = onlineUsers.includes(conversation.participants[0]._id);
                    return (
                      <Conversation
                        key={conversation._id}
                        conversation={conversation}
                        isOnline={isOnline}
                      />
                    );
                  })
                )
              )}
            </Flex>
          </Flex>
          {!selectedConversation?._id && (
            <Flex
              flex={70}
              borderRadius={"md"}
              p={2}
              flexDir={"column"}
              alignItems={"center"}
              justifyContent={"center"}
              h="100%"
            >
              <Text fontSize={20}>Click a conversation to start chatting</Text>
            </Flex>
          )}
          {selectedConversation?._id && <MessageContainer />}
        </Flex>
      </Box>
    </>
  );
};

export default ChatPage;
