import React, { useEffect, useState } from "react";
import { Flex, Box, useColorModeValue } from "@chakra-ui/react";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import ChatPage from "../ChatPage";


const Homepage = () => {
    const user = useRecoilValue(userAtom);

    return (
            <ChatPage />
    );
};

export default Homepage;
