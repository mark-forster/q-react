// src/layouts/AppLayout.jsx  (FINAL FIXED FULLSCREEN VERSION)

import React from "react";
import { Flex } from "@chakra-ui/react";
 import GlobalHeader from "../components/GlobalHeader";
 import LeftAppSidebar from "../components/LeftAppSidebar";
import ChatPage from "../ChatPage";

const AppLayout = ({ children }) => {
  return (
    <Flex
      direction="column"
      w="100vw"
      h="100vh"
      overflow="hidden"     // VERY IMPORTANT
      bg="gray.100"
    >
      {/* TOP GLOBAL HEADER */}
      <GlobalHeader />

      {/* MAIN BODY */}
      <Flex flex="1" w="100%" overflow="hidden">
        
        {/* MAIN CONTENT (ChatPage) */}
        <Flex flex="1" overflow="hidden">
            <ChatPage />
        </Flex>

      </Flex>
    </Flex>
  );
};

export default AppLayout;
