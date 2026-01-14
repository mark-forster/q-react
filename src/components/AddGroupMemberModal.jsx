import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Input,
  Flex,
  Text,
  Avatar,
  Box,
  Button,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiCheck, FiX } from "react-icons/fi";
import { useGroupProfile } from "../hooks/useGroupProfile";

const AddGroupMemberModal = ({
  isOpen,
  onClose,
  allUsers = [],
  members = [],
  onAdd, // (userIds: string[]) 
  addingUser,
}) => {
  const brandColor = useColorModeValue("#23ADE3", "#3FB07B");
  const hoverBg = useColorModeValue("gray.100", "whiteAlpha.100");
  /* =============================
     STATES
  ============================= */
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  /* =============================
     FILTER EXISTING MEMBERS
  ============================= */
  const memberIds = useMemo(
    () => new Set(members.map((m) => String(m._id))),
    [members]
  );

  const availableUsers = useMemo(() => {
    return allUsers.filter((u) => !memberIds.has(String(u._id)));
  }, [allUsers, memberIds]);

  /* =============================
     SEARCH (DEBOUNCED) 
  ============================= */
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const term = searchTerm.toLowerCase();

      setFilteredUsers(
        availableUsers.filter((u) =>
          (u.name || u.username || u.email || "").toLowerCase().includes(term)
        )
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, availableUsers, isOpen]);

  /* =============================
     INIT FILTER WHEN OPEN
  ============================= */
  useEffect(() => {
    if (isOpen) {
      setFilteredUsers(availableUsers);
      setSearchTerm("");
      setSelectedIds([]);
    }
  }, [isOpen, availableUsers]);

  /* =============================
     SELECTION LOGIC
  ============================= */
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedUsers = availableUsers.filter((u) =>
    selectedIds.includes(String(u._id))
  );

  const handleAdd = () => {
    if (selectedIds.length === 0) return;
    onAdd(selectedIds);
    onClose();
  };

  const handleCancel = () => {
    setSelectedIds([]);
    setSearchTerm("");
    onClose();
  };

  /* =============================
     UI
  ============================= */
  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="md" isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="16px">
        <ModalHeader>Add people</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          {/* SEARCH */}
          <Input
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            mb={3}
            borderRadius="full"
          />

          {/* SELECTED USERS PREVIEW */}
          {selectedUsers.length > 0 && (
            <Flex gap={3} mb={4} overflowX="auto">
              {selectedUsers.map((u) => (
                <Flex
                  key={u._id}
                  direction="column"
                  align="center"
                  minW="56px"
                  pt={1.5}
                >
                  <Box position="relative">
                    <Avatar
                      size="md"
                      src={u.profilePic?.url || u.profilePic || ""}
                    />
                    <Box
                      position="absolute"
                      top="-6px"
                      right="-6px"
                      bg="gray.700"
                      color="white"
                      borderRadius="full"
                      p="2px"
                      cursor="pointer"
                      onClick={() => toggleSelect(String(u._id))}
                    >
                      <FiX size={12} />
                    </Box>
                  </Box>
                  <Text fontSize="xs" noOfLines={1}>
                    {u.name}
                  </Text>
                </Flex>
              ))}
            </Flex>
          )}

          {/* USER LIST */}
          <Box maxH="320px" overflowY="auto">
            {filteredUsers.map((u) => {
              const checked = selectedIds.includes(String(u._id));
              return (
                <Flex
                  key={u._id}
                  align="center"
                  justify="space-between"
                  p={2}
                  borderRadius="md"
                  cursor="pointer"
                  bg={checked ? hoverBg : "transparent"}
                  _hover={{ bg: hoverBg }}
                  onClick={() => toggleSelect(String(u._id))}
                >
                  <Flex align="center" gap={3}>
                    <Avatar
                      size="sm"
                      src={u.profilePic?.url || u.profilePic || ""}
                    />
                    <Box>
                      <Text fontSize="sm" fontWeight="medium">
                        {u.name || u.username}
                      </Text>
                      {u.username && (
                        <Text fontSize="xs" color="gray.500">
                          @{u.username}
                        </Text>
                      )}
                    </Box>
                  </Flex>

                  <Flex
                    w="22px"
                    h="22px"
                    minW="22px"
                    minH="22px"
                    borderRadius="full"
                    border="2px solid"
                    borderColor={checked ? brandColor : "gray.400"}
                    bg={checked ? brandColor : "transparent"}
                    alignItems="center"
                    justifyContent="center"
                    transition="all 0.2s"
                    lineHeight="0"
                  >
                    {checked && (
                      <FiCheck
                        color="white"
                        size={14}
                        strokeWidth={4}
                        style={{
                          flexShrink: 0,
                          margin: "auto",
                        }}
                      />
                    )}
                  </Flex>
                </Flex>
              );
            })}
          </Box>
        </ModalBody>

        {/* FOOTER */}
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleAdd}
            isDisabled={selectedIds.length === 0}
            isLoading={addingUser}
            bg={useColorModeValue("#23ADE3", "#3FB07B")}
          >
            Add
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddGroupMemberModal;
