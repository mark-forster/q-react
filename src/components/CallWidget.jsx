// FINAL — Clean CallWidget (Messenger Style)

import React, { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Text,
  IconButton,
  Avatar,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";

import { FiMinimize2, FiMaximize2, FiX } from "react-icons/fi";
import { useRecoilValue } from "recoil";
import { selectedConversationAtom } from "../atoms/messageAtom";

const CallWidget = ({
  isCallModalOpen,
  handleEndCallLogic,
  currentCallType,
  incomingCallData
}) => {
  const selectedConversation = useRecoilValue(selectedConversationAtom);

  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isCallModalOpen) setIsMinimized(false);
  }, [isCallModalOpen]);

  if (!isCallModalOpen) return null;

  const partnerName = incomingCallData
    ? incomingCallData.name
    : selectedConversation?.username;

  const partnerPic =
    selectedConversation?.userProfilePic?.url || "/no-pic.jpeg";

  const toggleMin = () => setIsMinimized(!isMinimized);
  const toggleExp = () => setIsExpanded(!isExpanded);

  const widgetW = isMinimized ? "260px" : isExpanded ? "45vw" : "320px";
  const widgetH = isMinimized ? "60px" : isExpanded ? "65vh" : "420px";
  const zegoH = isMinimized ? "0px" : isExpanded ? "calc(65vh - 55px)" : "360px";

  return (
    <Box
      position="fixed"
      bottom="20px"
      right="20px"
      width={widgetW}
      height={widgetH}
      bg="whiteAlpha.900"
      borderRadius="lg"
      boxShadow="2xl"
      overflow="hidden"
      zIndex={2000}
      p={isMinimized ? 2 : 3}
      transition="all .25s"
    >
      <Flex justify="space-between" align="center">
        <Flex align="center">
          {!isMinimized && <Avatar size="xs" src={partnerPic} mr={2} />}
          <Text fontSize="xs" fontWeight="bold">
            {partnerName}
          </Text>
        </Flex>

        <Flex gap={1}>
          {currentCallType === "video" && (
            <IconButton
              size="xs"
              icon={isExpanded ? <FiMinimize2 /> : <FiMaximize2 />}
              onClick={toggleExp}
            />
          )}

          <IconButton
            size="xs"
            icon={isMinimized ? <FiMaximize2 /> : <FiMinimize2 />}
            onClick={toggleMin}
          />

          <IconButton
            size="xs"
            icon={<FiX />}
            colorScheme="red"
            onClick={() => handleEndCallLogic(true)}
          />
        </Flex>
      </Flex>

      {!isMinimized && (
        <Box
          id="zego-call-container"
          bg="black"
          borderRadius="md"
          mt={3}
          width="100%"
          height={zegoH}
        />
      )}
    </Box>
  );
};

export default CallWidget;
