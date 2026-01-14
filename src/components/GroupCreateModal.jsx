import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Flex,
  Avatar,
  Checkbox,
  Text,
  Spinner,
  useToast,
  useColorModeValue,
} from "@chakra-ui/react";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

export default function GroupCreateModal({ isOpen, onClose, onCreated }) {
  const currentUser = useRecoilValue(userAtom);
  const toast = useToast();

  const [groupName, setGroupName] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await api.get("/auth/users");
        const list = res.data.users || [];
        const filtered = list.filter((u) => u._id !== currentUser._id);

        setUsers(filtered);
        setFilteredUsers(filtered);
      } catch {
        toast({ title: "Users မယူနိုင်ပါ", status: "error" });
      }

      setLoadingUsers(false);
    };

    loadUsers();
  }, [isOpen]);

  // Search
  useEffect(() => {
    const timer = setTimeout(() => {
      const term = searchTerm.toLowerCase();
      setFilteredUsers(
        users.filter((u) =>
          (u.name || u.username || "").toLowerCase().includes(term)
        )
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, users]);

  const toggleMember = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      return toast({ title: "Group name ထည့်ပါ", status: "warning" });
    }
    if (selectedMembers.length < 1) {
      return toast({ title: "Something is wrong", status: "warning" });
    }
    try {
      setLoading(true);
      const res = await api.post("/messages/group/create", {
        name: groupName,
        members: selectedMembers,
      });

      onCreated(res.data.conversation);
      toast({ title: "Group ဖန်တီးပြီးပါပြီ", status: "success" });

      setGroupName("");
      setSelectedMembers([]);
      setSearchTerm("");
      onClose();
    } catch {
      toast({ title: "မအောင်မြင်ပါ", status: "error" });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay />

      <ModalContent borderRadius="18px">
        <ModalHeader fontWeight="bold" fontSize="xl" textAlign="center">
          Create New Group
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <Input
            placeholder="Group name…"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            mb={4}
            borderRadius="full"
          />

          <Input
            placeholder="Search members…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            mb={3}
            borderRadius="full"
          />

          <Text fontWeight="bold" mb={2}>
            Select Members
          </Text>

          {loadingUsers ? (
            <Flex justify="center" py={5}>
              <Spinner size="lg" />
            </Flex>
          ) : (
            <Flex direction="column" gap={3} maxH="280px" overflowY="auto">
              {filteredUsers.map((u) => (
                <Flex
                  key={u._id}
                  align="center"
                  justify="space-between"
                  p={2}
                  borderRadius="md"
                  _hover={{
                    bg: useColorModeValue("#d5ebf6", "#c1f0f040"),
                    opacity: 0.9,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  }}
                  onClick={() => toggleMember(u._id)}
                  cursor={"pointer"}
                >
                  <Flex align="center" gap={3}>
                    <Avatar size="sm" src={u.profilePic?.url || ""} />
                    <Text color={useColorModeValue("dark", "white")}>
                      {u.name}
                    </Text>
                  </Flex>

                  <Checkbox
                    isChecked={selectedMembers.includes(u._id)}
                    onChange={() => toggleMember(u._id)}
                    sx={{
                      "span.chakra-checkbox__control": {
                        borderColor: useColorModeValue(
                          "gray.300",
                          "whiteAlpha.500"
                        ),
                        borderWidth: "2px",
                        _checked: {
                          bg: useColorModeValue("#23ADE3", "#3FB07B"),
                          borderColor: useColorModeValue("#23ADE3", "#3FB07B"),
                          color: "white",
                        },
                        _hover: {
                          borderColor: useColorModeValue("#23ADE3", "#3FB07B"),
                        },
                      },
                    }}
                  />
                </Flex>
              ))}
            </Flex>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            w="100%"
            borderRadius="full"
            onClick={handleCreate}
            isLoading={loading}
            loadingText="Creating..."
            isDisabled={loading}
            bg={useColorModeValue("#23ADE3", "#3FB07B")}
            _hover={{
              opacity: 0.9,
              boxShadow: "0 4px 12px rgba(35, 173, 227, 0.3)",
            }}
          >
            Create Group
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
