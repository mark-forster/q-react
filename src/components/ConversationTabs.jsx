import React, { useState } from "react";
import {
  Flex,
  Tabs,
  TabList,
  Tab,
  Badge,
} from "@chakra-ui/react";

import ConversationList from "./ConversationList";

const ConversationTabs = ({
  conversations,
  loading,
  onlineUsers,
  onConversationClick,
  onDelete,
  onOpenGroupProfile,
}) => {
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabsChange = (index) => {
    setTabIndex(index);
  };

  // FILTERING
  const filteredConversations = () => {
    switch (tabIndex) {
      case 1: // Groups
        return conversations.filter((conv) => conv.isGroup);
      default: // All
        return conversations;
    }
  };

  const allCount = conversations.length;
  const groupCount = conversations.filter((c) => c.isGroup).length;

  return (
    <Flex direction="column" h="100%">
      <Tabs
        index={tabIndex}
        onChange={handleTabsChange}
        variant="enclosed"
        size="sm"
        mb={2}
      >
        <TabList>
          <Tab>
            All{" "}
            {allCount > 0 && (
              <Badge ml={2} colorScheme="gray">
                {allCount}
              </Badge>
            )}
          </Tab>

          <Tab>
            Groups{" "}
            {groupCount > 0 && (
              <Badge ml={2} colorScheme="purple">
                {groupCount}
              </Badge>
            )}
          </Tab>
        </TabList>
      </Tabs>

      <ConversationList
        conversations={filteredConversations()}
        loading={loading}
        onlineUsers={onlineUsers}
        onConversationClick={onConversationClick}
        onDelete={onDelete}
        onOpenGroupProfile={onOpenGroupProfile}
      />
    </Flex>
  );
};

export default ConversationTabs;
