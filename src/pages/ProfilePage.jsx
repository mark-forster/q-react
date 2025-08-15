import {
    Flex,
    Box,
    Heading,
    Text,
    Stack,
    Button,
    useColorModeValue,
    Avatar,
    Center,
    List,
    ListItem,
    ListIcon,
    Divider,
    IconButton,
} from "@chakra-ui/react";
import { useNavigate, useParams,Link as RouterLink, } from "react-router-dom";
import { useEffect, useState } from "react";
import {
    MdEdit,
    MdPayment,
    MdLanguage,
    MdHistory,
    MdPeople,
    MdHelp,
    MdLock,
} from "react-icons/md";
import { ChevronRightIcon, ArrowBackIcon } from "@chakra-ui/icons";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";

function ProfilePage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const currentUser = useRecoilValue(userAtom);

    const user = currentUser;

    if (!user) {
        return (
            <Center h="100vh">
                <Text>User not found or not logged in.</Text>
            </Center>
        );
    }
    
    return (
        <Flex align={"center"} justify={"center"} minH={"100vh"}>
            {/* The spacing on this Stack has been reduced to create a more compact layout */}
            <Stack spacing={4} mx={"auto"} maxW={"lg"} py={6} px={6} w="full">
                {/* Header Section */}
                <Flex alignItems="center" justifyContent="flex-start" mb={2}>
                    <IconButton
                        aria-label="Back to previous page"
                        icon={<ArrowBackIcon />}
                        onClick={() => navigate(-1)}
                        variant="ghost"
                        size="md"
                    />
                    <Heading fontSize={"2xl"} ml={2}>
                        Profile
                    </Heading>
                </Flex>

                {/* Profile Info Section */}
                <Box
                    rounded={"lg"}
                    bg={useColorModeValue("white", "gray.700")}
                    boxShadow={"lg"}
                    p={8}
                    textAlign="center"
                >
                    <Center>
                        <Avatar size="xl" name={user.name} src={user.profilePic.url} mb={4} />
                    </Center>
                    <Text fontSize={"xl"} fontWeight="bold">
                        {user.name}
                    </Text>
                    <Text fontSize={"md"} color="gray.500">
                        {user.email}
                    </Text>
                </Box>
                
                {/* A Divider is added for a clean visual separation */}
                <Divider />

                {/* Personal Information Section and Address Section are now combined for a cleaner look */}
                <Box rounded={"lg"} bg={useColorModeValue("white", "gray.700")} boxShadow={"lg"} p={6}>
                    <Heading fontSize="md" mb={4}>Personal Information</Heading>
                    <List spacing={3}>
                        <ListItem display="flex" alignItems="center" justifyContent="space-between" cursor="pointer">
                            <Flex alignItems="center">
                                <ListIcon as={MdEdit} color="gray.500" />
                                <Text as={RouterLink} to={`/edit_profile/${user._id}`}>Edit Profile</Text>
                            </Flex>
                            <ChevronRightIcon color="gray.500" />
                        </ListItem>
                        <ListItem display="flex" alignItems="center" justifyContent="space-between" cursor="pointer">
                            <Flex alignItems="center">
                                <ListIcon as={MdPayment} color="gray.500" />
                                <Text>Pravicy and Security</Text>
                            </Flex>
                            <ChevronRightIcon color="gray.500" />
                        </ListItem>
                        <ListItem display="flex" alignItems="center" justifyContent="space-between" cursor="pointer">
                            <Flex alignItems="center">
                                <ListIcon as={MdLock} color="gray.500" />
                                <Text> Change Password</Text>
                            </Flex>
                            <ChevronRightIcon color="gray.500" />
                        </ListItem>
                        
                    </List>
                    <Divider my={4} />
                    
                </Box>
                
            </Stack>
        </Flex>
    );
}

export default ProfilePage;
