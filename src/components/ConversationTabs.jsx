import React, { useState } from "react";
import {
  Flex,
  Text,
  useColorModeValue,
  Tabs,
  TabList,
  Tab,
} from "@chakra-ui/react";
import ConversationList from "./ConversationList";

const ConversationTabs = ({
  conversations,
  loading,
  onlineUsers,
  onConversationClick,
  onDelete,
}) => {
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabsChange = (index) => {
    setTabIndex(index);
  };

  const filteredConversations = () => {
    switch (tabIndex) {
      case 1: // Unread tab
        return conversations.filter(
          (conv) => conv.unreadCount > 0
        );
      case 2: // Groups tab
        return conversations.filter((conv) => conv.isGroup);
      default: // All tab
        return conversations;
    }
  };

  return (
    <Flex direction="column" h="100%">
      <Tabs index={tabIndex} onChange={handleTabsChange} variant="enclosed">
        <TabList>
          <Tab>All</Tab>
          <Tab>Unread</Tab>
          <Tab>Groups</Tab>
        </TabList>
      </Tabs>
      <ConversationList
        conversations={filteredConversations()}
        loading={loading}
        onlineUsers={onlineUsers}
        onConversationClick={onConversationClick}
        onDelete={onDelete}
      />
    </Flex>
  );
};

export default ConversationTabs;