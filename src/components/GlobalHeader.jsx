import React from "react";
import {
  Flex,
  Box,
  IconButton,
  Avatar,
  Tooltip,
  useColorMode,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Image
} from "@chakra-ui/react";

import { FiBell, FiSun, FiMoon } from "react-icons/fi";
import logo from "../assets/images/logo.png";
import { useRecoilValue, useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";

import { useNavigate } from "react-router-dom";
import axios from "axios";

const GlobalHeader = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const user = useRecoilValue(userAtom);
  const setUser = useSetRecoilState(userAtom);
  const navigate = useNavigate();

  //  Logout Logic
  const handleLogout = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const api = axios.create({
        baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
        withCredentials: true,
      });
    localStorage.removeItem("lastConversationId");

      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    }

    setUser(null);

    navigate("/auth");
  };

  return (
    <Flex
      h="60px"
      w="100%"
      bg={useColorModeValue("#23ADE3", "#3FB07B")}
borderBottom="1px solid"
borderColor={useColorModeValue("gray.200", "gray.700")}
      align="center"
      px={5}
      justify="space-between"
    >
      {/* LEFT SIDE (Logo) */}
<Flex align="center" gap={3}>
  <Image src={logo} alt="Logo" boxSize="60px" objectFit="contain" />
  <Box
    fontSize="lg"
    fontWeight="bold"
    color={useColorModeValue("white.700", "white.700")}
  >
    Arakkha Chat
  </Box>
</Flex>

      {/* RIGHT SIDE BUTTONS */}
      <Flex align="center" gap={3}>
        {/* Notifications */}
        <Tooltip label="Notifications">
          <IconButton icon={<FiBell />} size="sm" variant="ghost" />
        </Tooltip>

        {/* Dark/Light Mode */}
        <Tooltip label="Toggle Dark / Light Mode">
          <IconButton
            icon={colorMode === "light" ? <FiMoon /> : <FiSun />}
            size="sm"
            variant="ghost"
            onClick={toggleColorMode}
          />
        </Tooltip>

        {/* User Avatar with Dropdown */}
        <Menu>
          <MenuButton cursor="pointer">
            <Avatar
              size="sm"
              name={user?.username || user?.name}
              src={user?.profilePic?.url}
            />
          </MenuButton>

          <MenuList>
            <MenuItem onClick={() => navigate(`/profile/${user?._id}`)}>
              View Profile
            </MenuItem>

            <MenuItem onClick={handleLogout} color="red.500">
              Logout
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>
    </Flex>
  );
};

export default GlobalHeader;
