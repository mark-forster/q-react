import React from "react";
import {
  Box,
  Flex,
  Text,
  IconButton,
  Avatar,
  AvatarBadge,
  Divider,
  Stack,
  Button,
  useColorModeValue,
  Tooltip,
} from "@chakra-ui/react";

import { FiX, FiPhone, FiVideo } from "react-icons/fi";
import { getInitials, getAvatarColor } from "../utils/avatarHelpers";

const UserProfileSidebar = ({ user, onClose, isOnline }) => {
  const bg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const labelColor = useColorModeValue("gray.500", "gray.400");

  if (!user) return null;

  const name = user.name || user.username || "Unknown User";
  const username = user.username || null;

  const pic = user.profilePic;
  const profilePic = typeof pic === "string" ? pic : pic?.url || "";

  const initials = getInitials(name);
  const color = getAvatarColor(name);

  return (
    <Box
      w={{ base: "0px", md: "320px", lg: "340px" }}
      maxW="340px"
      h="100%"
      bg={bg}
      borderLeft={`1px solid ${borderColor}`}
      display={{ base: "none", md: "flex" }}
      flexDirection="column"
    >
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        px={4}
        py={3}
        borderBottom={`1px solid ${borderColor}`}
      >
        <Text fontWeight="bold" fontSize="md">
          User Info
        </Text>
        <IconButton
          aria-label="Close profile"
          icon={<FiX />}
          size="sm"
          variant="ghost"
          onClick={onClose}
        />
      </Flex>

      {/* Avatar / Name */}
      <Flex direction="column" align="center" py={6} px={4} gap={3}>
        {profilePic ? (
          <Avatar size="xl" src={profilePic}>
            <AvatarBadge
              boxSize="1.1em"
              bg={isOnline ? "green.500" : "orange"}
            />
          </Avatar>
        ) : (
          <Flex
            w="88px"
            h="88px"
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

        <Stack spacing={0} align="center">
          <Text fontWeight="bold" fontSize="lg">
            {name}
          </Text>
          {username && (
            <Text fontSize="sm" color={labelColor}>
              @{username}
            </Text>
          )}
          <Text fontSize="xs" color={labelColor}>
            {isOnline ? "Online" : "Last seen recently"}
          </Text>
        </Stack>
      </Flex>

      {/* Actions (Call / Video) */}
      <Flex justify="center" gap={3} px={4}>
        <Tooltip label="Voice Call">
          <Button
            leftIcon={<FiPhone />}
            size="sm"
            variant="outline"
            borderRadius="full"
             bg={useColorModeValue("#23ADE3","#3FB07B")}
          >
            Call
          </Button>
        </Tooltip>

        <Tooltip label="Video Call">
          <Button
            leftIcon={<FiVideo />}
            size="sm"
            variant="outline"
            borderRadius="full"
            bg={useColorModeValue("#23ADE3","#3FB07B")}
          >
            Video
          </Button>
        </Tooltip>
      </Flex>

      <Divider my={4} />

      {/* Info section  */}
      <Box px={4} pb={4} flex="1" overflowY="auto">
        <Stack spacing={4}>
          {/* Phone */}
          {user.phone && (
            <Box>
              <Text fontSize="xs" color={labelColor}>
                Phone
              </Text>
              <Text fontSize="sm">{user.phone}</Text>
            </Box>
          )}

          {/* Email */}
          {user.email && (
            <Box>
              <Text fontSize="xs" color={labelColor}>
                Email
              </Text>
              <Text fontSize="sm">{user.email}</Text>
            </Box>
          )}

          {/* Bio / About */}
          {user.bio && (
            <Box>
              <Text fontSize="xs" color={labelColor}>
                Bio
              </Text>
              <Text fontSize="sm" whiteSpace="pre-line">
                {user.bio}
              </Text>
            </Box>
          )}

          {!user.phone && !user.email && !user.bio && (
            <Text fontSize="sm" color={labelColor}>
              No additional info.
            </Text>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default UserProfileSidebar;
