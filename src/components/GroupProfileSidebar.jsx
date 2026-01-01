// components/GroupProfileSidebar.jsx
// Group Profile Sidebar — Modal-style design + Edit + Photo Upload UI
// Add Member → Modal with Search (no inline add section)

import React, { useMemo, useState, useRef } from "react";
import {
  Box,
  Flex,
  Text,
  IconButton,
  Divider,
  Stack,
  Button,
  Input,
  Avatar,
  Spinner,
  useDisclosure,
  useColorModeValue,
} from "@chakra-ui/react";

import { FiX, FiEdit2, FiCamera, FiTrash, FiUserPlus } from "react-icons/fi";
import { useGroupProfile } from "../hooks/useGroupProfile";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { getInitials, getAvatarColor } from "../utils/avatarHelpers";
import AddGroupMemberModal from "./AddGroupMemberModal";

const GroupProfileSidebar = ({ group, onClose }) => {
  const bg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const labelColor = useColorModeValue("gray.500", "gray.400");

  const currentUser = useRecoilValue(userAtom);

  // =========================
  // Add Member Modal control
  // =========================
  const {
    isOpen: isAddOpen,
    onOpen: openAddModal,
    onClose: closeAddModal,
  } = useDisclosure();

  // =========================
  // GROUP PROFILE HOOK
  // =========================
  const enabled = group?.isGroup === true && !!group?._id;

  const {
    loading,
    members,
    newName,
    setNewName,
    allUsers,
    addingUser,
    renameGroup,
    addMember,
    removeMember,
    leaveGroup,
  } = useGroupProfile(group, enabled);

  // =========================
  // EDIT + PHOTO STATE
  // =========================
  const [isEditing, setIsEditing] = useState(false);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(
    group?.photo?.url || group?.photo || ""
  );

  const fileInputRef = useRef(null);

  const handleSelectPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // =========================
  // SAVE HANDLER
  // =========================
  const handleSaveProfile = async () => {
    if (newName.trim()) {
      await renameGroup();
    }

    // 🔜 backend ready ဖြစ်ရင် photo upload ကို ဒီမှာချိတ်
    // const formData = new FormData();
    // formData.append("conversationId", group._id);
    // formData.append("name", newName);
    // if (photoFile) formData.append("photo", photoFile);
    // await api.put("/messages/group/update", formData);

    setIsEditing(false);
  };

  if (!group) return null;

  const title = group?.name || "Group Chat";
  const initials = getInitials(title);
  const color = getAvatarColor(title);

  // =========================
  // UI
  // =========================
  return (
    <>
      <Box
        w={{ base: "0px", md: "360px" }}
        h="100%"
        bg={bg}
        borderLeft={`1px solid ${borderColor}`}
        display={{ base: "none", md: "flex" }}
        flexDirection="column"
      >
        {/* ================= HEADER ================= */}
        <Flex
          align="center"
          justify="space-between"
          px={4}
          py={3}
          borderBottom={`1px solid ${borderColor}`}
        >
          <Text fontWeight="bold" fontSize="lg">
            Group Info
          </Text>

          <Flex gap={1}>
            <IconButton
              icon={<FiEdit2 />}
              size="sm"
              variant="ghost"
              aria-label="edit"
              onClick={() => setIsEditing((v) => !v)}
              title="Edit group"
            />
            <IconButton
              icon={<FiX />}
              size="sm"
              variant="ghost"
              onClick={onClose}
              aria-label="close"
            />
          </Flex>
        </Flex>

        {/* ================= BODY ================= */}
        <Box flex="1" overflowY="auto" px={4} py={4}>
          {loading ? (
            <Flex justify="center" py={10}>
              <Spinner size="lg" />
            </Flex>
          ) : (
            <>
              {/* GROUP AVATAR + NAME */}
              <Flex direction="column" align="center" mb={5}>
                <Box position="relative">
                  {photoPreview ? (
                    <Avatar src={photoPreview} w="92px" h="92px" />
                  ) : (
                    <Flex
                      w="92px"
                      h="92px"
                      borderRadius="full"
                      align="center"
                      justify="center"
                      fontWeight="bold"
                      fontSize="2xl"
                      color="white"
                      bg={color}
                    >
                      {initials}
                    </Flex>
                  )}

                  {isEditing && (
                    <Flex
                      position="absolute"
                      bottom="0"
                      right="0"
                      bg="blackAlpha.700"
                      borderRadius="full"
                      p={1.5}
                      cursor="pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FiCamera color="white" size={16} />
                    </Flex>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleSelectPhoto}
                  />
                </Box>

                <Stack spacing={1} align="center" mt={3} w="100%">
                  {isEditing ? (
                     <Box w="100%">
    {/* Title */}
    <Text
      fontSize="sm"
      fontWeight="semibold"
      color="gray.600"
      mb={2}
    >
      Change Group Name
    </Text>

    {/* Card */}
    <Box
      bg="gray.100"
      borderRadius="lg"
      p={3}
    >
      <Text
        fontSize="xs"
        color="gray.500"
        mb={1}
      >
        Group Name
      </Text>

      <Input
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        variant="unstyled"
        fontSize="md"
        fontWeight="medium"
        placeholder="Group name"
        color="black"               
         _focus={{ color: "black" }}
        _placeholder={{ color: "gray.400" }}
      />
    </Box>
  </Box>
                  ) : (
                    <Text fontWeight="bold" fontSize="lg">
                      {title}
                    </Text>
                  )}

                  {!isEditing && (
                    <Text fontSize="sm" color={labelColor}>
                    {members?.length || 0} members
                  </Text>
                  )}
                </Stack>
              </Flex>

              <Divider my={4} />

              {/* MEMBERS */}
             {!isEditing && (
                <>
                 <Flex justify="space-between" align="center" mb={2}>
                <Text fontWeight="bold">Members ({members.length})</Text>

                {/* 👉 Add Member → Modal */}
                <Button
                  size="sm"
                  leftIcon={<FiUserPlus />}
                  variant="outline"
                  onClick={openAddModal}
                >
                  Add
                </Button>
              </Flex>

              <Stack spacing={2} maxH="240px" overflowY="auto">
                {members.map((u) => (
                  <Flex
                    key={u._id}
                    align="center"
                    justify="space-between"
                    p={2}
                    borderRadius="md"
                    _hover={{ bg: "gray.100" }}
                  >
                    <Flex align="center" gap={3}>
                      <Avatar
                        size="sm"
                        src={u.profilePic?.url || u.profilePic || ""}
                      />
                      <Text fontSize="sm">
                        {u._id === currentUser._id ? `${u.name} (You)` : u.name}
                      </Text>
                    </Flex>

                    {u._id !== currentUser._id && (
                      <IconButton
                        icon={<FiTrash />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => removeMember(u._id)}
                      />
                    )}
                  </Flex>
                ))}
              </Stack>
              </>
             )}
            </>
          )}
        </Box>

        {/* ================= FOOTER ================= */}
        <Box px={4} py={3} borderTop={`1px solid ${borderColor}`}>
          <Stack spacing={2}>
            {isEditing && (
              <Button
                colorScheme="purple"
                w="100%"
                borderRadius="full"
                onClick={handleSaveProfile}
                isDisabled={!newName.trim()}
              >
                Save Changes
              </Button>
            )}

           {!isEditing &&(
             <Button
              colorScheme="red"
              variant="outline"
              w="100%"
              onClick={leaveGroup}
            >
              Leave Group
            </Button>
           )

           }
          </Stack>
        </Box>
      </Box>

      {/* ================= ADD MEMBER MODAL ================= */}
      <AddGroupMemberModal
        isOpen={isAddOpen}
        onClose={closeAddModal}
        allUsers={allUsers}
        members={members}
        addingUser={addingUser}
        onAdd={(userIds) => {
          userIds.forEach((id) => addMember(id));
        }}
      />
    </>
  );
};

export default GroupProfileSidebar;
