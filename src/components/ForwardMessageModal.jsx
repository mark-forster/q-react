import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  Input,
  InputGroup,
  InputLeftElement,
  HStack,
  useColorModeValue,
  Checkbox,
  Avatar,
  Text,
  Box,
  SkeletonCircle,
  Skeleton,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import toast from "react-hot-toast";
import axios from "axios";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import AttachmentDisplay from "./AttachmentDisplay";

// API
const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

const ForwardMessageModal = ({ isOpen, onClose, messageToForward, conversations }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchingUser, setSearchingUser] = useState(false);
  const [searchedUsers, setSearchedUsers] = useState([]);
  const currentUser = useRecoilValue(userAtom);

  // Debounced user search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim()) {
        setSearchingUser(true);
        setSearchedUsers([]);
        try {
          const response = await api.get(`/users/search/${searchQuery}`);
          if (response.data.errorMessage) {
            toast.error(response.data.errorMessage);
            setSearchedUsers([]);
            return;
          }
          const foundUsers = response.data.users;
          const filteredUsers = foundUsers.filter(
            (user) => user._id !== currentUser._id
          );
          setSearchedUsers(filteredUsers.length ? filteredUsers : []);
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

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, currentUser]);

  const toggleUser = (id) =>
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSend = async () => {
    try {
      await api.post(`/messages/message/forward/${messageToForward._id}`, {
        recipientIds: selectedUsers,
      });
      toast.success("Message forwarded.");
      onClose();
    } catch (error) {
      console.error("Error forwarding message:", error);
      toast.error(error?.response?.data?.error || "Unknown error");
    }
  };

  const usersToDisplay = searchQuery.trim()
    ? searchedUsers
    : conversations.map(c => c.participants[0]).filter(Boolean);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader>Forward Message</ModalHeader>
        <ModalBody>
          <Box mb={4}>
            <Text mb={2} fontWeight="medium">
              Message:
            </Text>
            <Box
              p={2}
              bg={useColorModeValue("gray.100", "gray.700")}
              borderRadius="md"
            >
              <Text>{messageToForward?.text}</Text>
              {messageToForward?.attachments?.length > 0 &&
                messageToForward.attachments.map((att, i) => (
                  <AttachmentDisplay key={i} attachment={att} />
                ))}
            </Box>
          </Box>
          <InputGroup mb={3}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          <VStack spacing={2} align="stretch" maxH="40vh" overflowY="auto">
            {searchingUser ? (
              [0, 1, 2].map((i) => (
                <HStack key={i} p={2}>
                  <SkeletonCircle size="8" />
                  <Skeleton h="10px" w="full" />
                </HStack>
              ))
            ) : usersToDisplay.length > 0 ? (
              usersToDisplay.map((u) => (
                <HStack
                  key={u._id}
                  p={2}
                  borderRadius="md"
                  _hover={{ bg: useColorModeValue("gray.100", "gray.700") }}
                  cursor="pointer"
                  onClick={() => toggleUser(u._id)}
                  bg={
                    selectedUsers.includes(u._id)
                      ? useColorModeValue("blue.50", "blue.900")
                      : "transparent"
                  }
                >
                  <Checkbox
                    isChecked={selectedUsers.includes(u._id)}
                    onChange={() => toggleUser(u._id)}
                    colorScheme="blue"
                  />
                  <Avatar src={u?.profilePic} name={u?.name} size="sm" />
                  <Text>{u?.name}</Text>
                </HStack>
              ))
            ) : (
              <Text textAlign="center" color="gray.500">
                {searchQuery.trim() ? "No users found." : "No conversations found."}
              </Text>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="blue"
            mr={3}
            onClick={handleSend}
            isDisabled={!selectedUsers.length}
          >
            Send To ({selectedUsers.length})
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ForwardMessageModal;