import React, { useState } from "react";
import {
  Flex,
  Tooltip,
  IconButton,
  Badge,
  useColorModeValue,
  Text,
} from "@chakra-ui/react";
import { BsBellFill } from "react-icons/bs";
import { FaUser, FaUserFriends } from "react-icons/fa";
import { FaMessage } from "react-icons/fa6";

import { useRecoilValue } from "recoil";
import { conversationsAtom } from "../atoms/messageAtom";
import userAtom from "../atoms/userAtom";

const LeftAppSidebar = ({ onChangeFilter }) => {
  const conversations = useRecoilValue(conversationsAtom);
  const currentUser = useRecoilValue(userAtom);

  const [filterType, setFilterType] = useState("all");

  const allCount = conversations.length;
  const groupCount = conversations.filter((c) => c.isGroup).length;
  const personalCount = conversations.filter((c) => !c.isGroup).length;

  const unreadCount = conversations.filter(
    (c) => Number(c.unreadCount || 0) > 0
  ).length;

  const menuItems = [
    {
      id: "all",
      label: "All Chats",
      icon: <FaMessage size={22} />,
      count: allCount,
      color: "gray",
    },
    {
      id: "personal",
      label: "Personal",
      icon: <FaUser size={22} />,
      count: personalCount,
      color: "gray",
    },
    {
      id: "groups",
      label: "Groups",
      icon: <FaUserFriends size={22} />,
      count: groupCount,
      color: "gray",
    },
    {
      id: "unread",
      label: "Unread",
      icon: <BsBellFill size={22} />,
      count: unreadCount,
      color: "red",
    },
  ];

  const handleClick = (id) => {
    setFilterType(id);
    onChangeFilter(id);
  };

  return (
    <Flex direction="column" align="center" gap={4}>
      {menuItems.map((item) => (
        <Tooltip
          key={item.id}
          label={`${item.label} (${item.count})`}
          placement="right"
          bg="gray.700"
        >
          <Flex direction="column" align="center">
            <IconButton
              icon={item.icon}
              aria-label={item.label}
              size="lg"
              variant="ghost"
              color={useColorModeValue(
                filterType === item.id ? "blue.600" : "gray.500",
                filterType === item.id ? "blue.300" : "gray.400"
              )}
              _hover={{
                bg: useColorModeValue("gray.200", "gray.700"),
              }}
              bg={
                filterType === item.id
                  ? useColorModeValue("gray.300", "#243b53")
                  : "transparent"
              }
              onClick={() => handleClick(item.id)}
              borderRadius="md"
              p={1}
            />
            {item.count >= 0 && (
              <Text
                fontSize="10px"
                color={useColorModeValue(
                  filterType === item.id ? "blue.600" : "gray.500",
                  filterType === item.id ? "blue.300" : "gray.400"
                )}
                fontWeight={filterType === item.id ? "bold" : "normal"}
                borderRadius="md"
              >
                {item.label}
              </Text>
            )}
          </Flex>
        </Tooltip>
      ))}
    </Flex>
  );
};

export default LeftAppSidebar;
