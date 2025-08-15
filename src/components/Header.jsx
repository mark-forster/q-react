import React from "react";
import {
  Flex,
  Link,
  Text,
  IconButton,
  useColorMode,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
} from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useRecoilValue, useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import { FaMoon, FaSun } from "react-icons/fa";

const Header = () => {
  const user = useRecoilValue(userAtom);
  const setUser = useSetRecoilState(userAtom);
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();

  // The logout logic is now handled here.
  const handleLogout = () => {
    // Clear the user from Recoil state
    setUser(null);
    // Navigate back to the home page
    navigate("/");
  };

  return (
    <Flex
      justifyContent={"space-between"}
      alignItems={"center"}
      py={4}
      px={5}
      bg={useColorModeValue("gray.100", "gray.700")}
      borderRadius="lg"
      boxShadow="md"
    >
      {/* Logo/App Name */}
      <Link as={RouterLink} to="/">
        <Flex align="center" gap={2}>
          <img src="/m-logo.png" alt="logo" width="28" height="28" />
          <Text fontSize="xl" fontWeight="bold" letterSpacing={2} >
            Chat Arakkha
          </Text>
        </Flex>
      </Link>

      {/* Right side with user avatar and color mode toggle */}
      <Flex gap={4} alignItems="center">
        {user && (
          <>
            <IconButton
              aria-label="Toggle color mode"
              icon={colorMode === "light" ? <FaMoon /> : <FaSun />}
              onClick={toggleColorMode}
              size="sm"
              borderRadius="full"
            />
            {/* Profile Menu with Dropdown */}
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Profile options"
                icon={
                  <Avatar
                    size="sm"
                    name={user.name}
                    src={user.profilePic.url}
                  />
                }
                variant="ghost"
                borderRadius="full"
              />
              <MenuList>
                {/* Profile Link */}
                <MenuItem as={RouterLink} to={`/profile/${user._id}`}>
                  Profile
                </MenuItem>
                {/* Settings Link (placeholder) */}
                <MenuItem as={RouterLink} to="/settings">
                  Settings
                </MenuItem>
                {/* Logout Button */}
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </MenuList>
            </Menu>
          </>
        )}
      </Flex>
    </Flex>
  );
};

export default Header;
