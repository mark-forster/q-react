// LeftAppSidebar.jsx — UI same, logic uses unreadCount

import React, { useState } from "react";
import { Flex, Tooltip, IconButton, Badge } from "@chakra-ui/react";
import { FiMessageSquare, FiUsers, FiBell } from "react-icons/fi";
import { useRecoilValue } from "recoil";
import { conversationsAtom } from "../atoms/messageAtom";
import userAtom from "../atoms/userAtom";

const LeftAppSidebar = ({ onChangeFilter }) => {
  const conversations = useRecoilValue(conversationsAtom);
  const currentUser = useRecoilValue(userAtom);

  const [filterType, setFilterType] = useState("all");

  const allCount = conversations.length;
  const groupCount = conversations.filter((c) => c.isGroup).length;

  // unreadCount သာမန်အသုံးပြု
  const unreadCount = conversations.filter(
    (c) => Number(c.unreadCount || 0) > 0
  ).length;

  const menuItems = [
    {
      id: "all",
      label: "All Chats",
      icon: <FiMessageSquare size={22} />,
      count: allCount,
      color: "gray",
    },
    {
      id: "groups",
      label: "Groups",
      icon: <FiUsers size={22} />,
      count: groupCount,
      color: "purple",
    },
    {
      id: "unread",
      label: "Unread",
      icon: <FiBell size={22} />,
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
              color={filterType === item.id ? "brand.500" : "gray.300"}
              _hover={{ color: "brand.400", bg: "gray.700" }}
              bg={filterType === item.id ? "gray.800" : "transparent"}
              onClick={() => handleClick(item.id)}
              borderRadius="md"
              p={2}
            />
            {item.count > 0 && (
              <Badge
                mt={1}
                fontSize="10px"
                colorScheme={item.color}
                borderRadius="md"
              >
                {item.label}
              </Badge>
            )}
          </Flex>
        </Tooltip>
      ))}
    </Flex>
  );
};

export default LeftAppSidebar;
