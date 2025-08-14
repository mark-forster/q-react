import React, { useEffect, useState } from "react";
import { Flex, Box, useColorModeValue } from "@chakra-ui/react";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import ChatPage from "../ChatPage";


const Homepage = () => {
    const user = useRecoilValue(userAtom);

    return (
        <Flex
            maxW={"1200px"}
            mx={"auto"} 
            my={5} 
            p={4} 
            minH={"100vh"}
        >
            <ChatPage />
        </Flex>
    );
};

export default Homepage;
