import {
    Flex,
    Box,
    FormControl,
    FormLabel,
    Input,
    Stack,
    Button,
    Heading,
    useColorModeValue,
    Avatar,
    Center,
    Textarea,
    IconButton,
} from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { ArrowBackIcon } from "@chakra-ui/icons";

function EditProfilePage() {
    const user = useRecoilValue(userAtom);
    const setUser = useSetRecoilState(userAtom);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [inputs, setInputs] = useState({
        name: "",
        username: "",
        email: "",
        bio: "", // Add bio field from user model
      
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(user?.profilePic.url || "");
    const [loading, setLoading] = useState(false);
    const API_BASE = import.meta.env.VITE_API_URL || "";

    useEffect(() => {
        if (user) {
            setInputs({
                name: user.name,
                username: user.username,
                email: user.email,
                bio: user.bio || "", // Initialize bio from user data
            });
            setImagePreview(user.profilePic.url || "");
        }
    }, [user]);

    useEffect(() => {
        if (imageFile) {
            const objectUrl = URL.createObjectURL(imageFile);
            setImagePreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
    }, [imageFile]);

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            const api = axios.create({
                baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
                withCredentials: true,
            });

            const formData = new FormData();
            formData.append("name", inputs.name);
            formData.append("username", inputs.username);
            formData.append("email", inputs.email);
            formData.append("bio", inputs.bio); // Add bio to formData
          
            if (imageFile) {
                formData.append("image", imageFile);
            }

            const result = await api.put("/users/update", formData);
            console.log(result);
            if (result.status === 200) {
                toast.success("Profile updated successfully!");
                setUser(result.data.user);
                navigate(`/profile/${result.data.user._id}`);
            }
        } catch (error) {
            console.error(error);
            const errorMessage = error.response?.data?.errorMessage || "Failed to update profile.";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Flex align={"center"} justify={"center"} minH={"100vh"}>
            <Stack spacing={8} mx={"auto"} maxW={"lg"} py={12} px={6} w="full">
                <Flex alignItems="center" justifyContent="flex-start" mb={4}>
                    <IconButton
                        aria-label="Back to previous page"
                        icon={<ArrowBackIcon />}
                        onClick={() => navigate(-1)}
                        variant="ghost"
                        size="md"
                    />
                    <Heading fontSize={"2xl"} ml={2}>
                        Edit Profile
                    </Heading>
                </Flex>

                <Box
                    rounded={"lg"}
                    bg={useColorModeValue("white", "gray.700")}
                    boxShadow={"lg"}
                    p={8}
                >
                    <Center>
                        <Avatar 
                            size="xl" 
                            name={inputs.name} 
                            src={imagePreview} 
                            mb={4} 
                            cursor="pointer"
                            onClick={() => fileInputRef.current.click()}
                        />
                    </Center>
                    <Stack spacing={4}>
                        <FormControl id="name">
                            <FormLabel>Name</FormLabel>
                            <Input
                                type="text"
                                value={inputs.name}
                                onChange={(e) => setInputs({ ...inputs, name: e.target.value })}
                            />
                        </FormControl>
                        <FormControl id="username">
                            <FormLabel>Username</FormLabel>
                            <Input
                                type="text"
                                value={inputs.username}
                                onChange={(e) => setInputs({ ...inputs, username: e.target.value })}
                            />
                        </FormControl>
                        <FormControl id="email">
                            <FormLabel>Email Address</FormLabel>
                            <Input
                                type="email"
                                value={inputs.email}
                                onChange={(e) => setInputs({ ...inputs, email: e.target.value })}
                            />
                        </FormControl>
                        <FormControl id="bio">
                            <FormLabel>Bio</FormLabel>
                            <Textarea
                                placeholder="Write a short bio about yourself..."
                                value={inputs.bio}
                                onChange={(e) => setInputs({ ...inputs, bio: e.target.value })}
                            />
                        </FormControl>
                        <FormControl id="profilePic" display="none">
                            <FormLabel>Profile Picture</FormLabel>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImageFile(e.target.files[0])}
                                ref={fileInputRef}
                            />
                        </FormControl>
                       
                        <Stack spacing={4} pt={2}>
                            <Button
                                loadingText="Updating"
                                isLoading={loading}
                                size="lg"
                                bg={"blue.400"}
                                color={"white"}
                                _hover={{
                                    bg: "blue.500",
                                }}
                                onClick={handleUpdateProfile}
                            >
                                Update Profile
                            </Button>
                            <Button
                                size="lg"
                                variant="ghost"
                                onClick={() => navigate(`/profile/${user._id}`)}
                            >
                                Cancel
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            </Stack>
        </Flex>
    );
}

export default EditProfilePage;
