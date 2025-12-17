// GroupProfileModal.jsx — Messenger Style UI Only (Logic not changed)

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Input,
  Flex,
  Text,
  Avatar,
  IconButton,
  Divider,
  Spinner,
  useToast,
  Box,
} from "@chakra-ui/react";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRecoilValue, useSetRecoilState } from "recoil";

import userAtom from "../atoms/userAtom";
import {
  conversationsAtom,
  selectedConversationAtom,
} from "../atoms/messageAtom";

import { FiTrash, FiUserPlus } from "react-icons/fi";
import { useSocket } from "../context/SocketContext";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

export default function GroupProfileModal({ isOpen, onClose, group }) {
  const toast = useToast();
  const currentUser = useRecoilValue(userAtom);

  const setSelectedConversation = useSetRecoilState(selectedConversationAtom);
  const setConversations = useSetRecoilState(conversationsAtom);

  const { socket } = useSocket();

  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [newName, setNewName] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [showAddSection, setShowAddSection] = useState(false);

  // Load all users for adding member
  useEffect(() => {
    if (!isOpen || !group?._id) return;

    setNewName(group?.name || "");
    setMembers(group?.participants || []);
    setLoading(true);

    api
      .get("/auth/users")
      .then((res) => {
        const list = res.data?.users || [];
        setAllUsers(list.filter((u) => u._id !== currentUser._id));
      })
      .catch(() => {
        toast({ title: "အသုံးပြုသူများ မယူလို့မရပါ", status: "error" });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, group, currentUser._id, toast]);

  // Rename group
  const handleRename = async () => {
    if (!newName.trim()) {
      return toast({ title: "Group name မဖြစ်မနေလိုအပ်ပါတယ်", status: "warning" });
    }

    try {
      await api.put("/messages/group/rename", {
        conversationId: group._id,
        name: newName,
      });

      setConversations((prev) =>
        prev.map((c) =>
          c._id === group._id ? { ...c, name: newName } : c
        )
      );

      setSelectedConversation((prev) =>
        prev && prev._id === group._id ? { ...prev, name: newName } : prev
      );

      toast({ title: "Group name ပြင်ပြီးပါပြီ", status: "success" });
      onClose();
    } catch (e) {
      toast({ title: "မအောင်မြင်ပါ", status: "error" });
    }
  };

  // Add member
  const handleAddMember = async (userId) => {
    if (!userId) return;
    setAddingUser(true);

    try {
      const res = await api.post("/messages/group/add-member", {
        conversationId: group._id,
        userId,
      });

      const newMember = res.data?.user;
      if (newMember) {
        setMembers((prev) => [...prev, newMember]);
      }

      socket?.emit("joinConversationRoom", {
        conversationId: group._id,
      });

      toast({ title: "အသစ်ဝင်ပေးလိုက်ပါပြီ", status: "success" });
    } catch {
      toast({ title: "မဖြစ်နိုင်ပါ", status: "error" });
    }

    setAddingUser(false);
  };

  // Remove member
  const handleRemove = async (userId) => {
    if (!window.confirm("Member ကိုဖယ်မလား?")) return;

    try {
      await api.post("/messages/group/remove-member", {
        conversationId: group._id,
        userId,
      });

      setMembers((prev) => prev.filter((m) => m._id !== userId));
      toast({ title: "ဖယ်ရှားပြီးပါပြီ", status: "success" });
    } catch {
      toast({ title: "မဖယ်နိုင်ပါ", status: "error" });
    }
  };

  // Leave group
  const handleLeave = async () => {
    if (!window.confirm("Group ထဲက ထွက်မလား?")) return;

    try {
      await api.post("/messages/group/leave", {
        conversationId: group._id,
      });

      setConversations((prev) =>
        prev.filter((c) => c._id !== group._id)
      );
      setSelectedConversation(null);

      toast({ title: "Group ကိုထွက်ထွက်ပြီးပါပြီ", status: "info" });
      onClose();
    } catch {
      toast({ title: "မအောင်မြင်ပါ", status: "error" });
    }
  };

  return (
    <Modal size="lg" isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="18px" p={1}>
        <ModalHeader textAlign="center" fontSize="xl" fontWeight="bold">
          Group Info
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          {loading ? (
            <Flex justify="center" py={8}>
              <Spinner size="lg" />
            </Flex>
          ) : (
            <>
              {/* GROUP ICON + NAME */}
              <Flex direction="column" align="center" mb={5}>
                <Flex
                  w="70px"
                  h="70px"
                  bg="purple.500"
                  borderRadius="full"
                  align="center"
                  justify="center"
                  color="white"
                  fontSize="2xl"
                  fontWeight="bold"
                >
                  {group?.name?.substring(0, 2)?.toUpperCase()}
                </Flex>

                <Input
                  mt={3}
                  textAlign="center"
                  fontWeight="bold"
                  fontSize="lg"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </Flex>

              <Divider my={4} />

              {/* Member Section */}
              <Text fontWeight="bold" mb={2}>
                Members ({members.length})
              </Text>

              <Flex direction="column" gap={2} maxH="250px" overflowY="auto">
                {members.map((user) => (
                  <Flex
                    key={user._id}
                    p={2}
                    align="center"
                    justify="space-between"
                    borderRadius="md"
                    _hover={{ bg: "gray.100" }}
                  >
                    <Flex align="center" gap={3}>
                      <Avatar
                        size="sm"
                        src={user.profilePic?.url || user.profilePic || ""}
                      />
                      <Text>
                        {user._id === currentUser._id
                          ? `${user.name} (You)`
                          : user.name}
                      </Text>
                    </Flex>

                    {user._id !== currentUser._id && (
                      <IconButton
                        icon={<FiTrash />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => handleRemove(user._id)}
                      />
                    )}
                  </Flex>
                ))}
              </Flex>

              <Divider my={4} />

              {/* ADD MEMBER */}
              <Flex justify="space-between" align="center" mb={2}>
                <Text fontWeight="bold">Add Members</Text>
                <IconButton
                  icon={<FiUserPlus />}
                  size="sm"
                  onClick={() => setShowAddSection(!showAddSection)}
                />
              </Flex>

              {showAddSection && (
                <Box
                  border="1px solid #ddd"
                  borderRadius="md"
                  p={2}
                  maxH="180px"
                  overflowY="auto"
                >
                  {allUsers.length === 0 ? (
                    <Text textAlign="center">No users available</Text>
                  ) : (
                    allUsers
                      .filter((u) => !members.some((m) => m._id === u._id))
                      .map((u) => (
                        <Flex
                          key={u._id}
                          align="center"
                          justify="space-between"
                          p={2}
                          borderRadius="md"
                          _hover={{ bg: "gray.100" }}
                        >
                          <Flex align="center" gap={3}>
                            <Avatar size="sm" src={u.profilePic?.url || ""} />
                            <Text>{u.name}</Text>
                          </Flex>

                          <Button
                            size="sm"
                            isLoading={addingUser}
                            colorScheme="purple"
                            onClick={() => handleAddMember(u._id)}
                          >
                            Add
                          </Button>
                        </Flex>
                      ))
                  )}
                </Box>
              )}

              <Divider my={4} />

              {/* Leave Button */}
              <Button
                w="100%"
                colorScheme="red"
                variant="outline"
                onClick={handleLeave}
              >
                Leave Group
              </Button>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="purple"
            w="100%"
            onClick={handleRename}
            borderRadius="full"
          >
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
