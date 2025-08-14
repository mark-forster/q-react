import {
  Flex,
  Box,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Button,
  Heading,
  Text,
  useColorModeValue,
  Link,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useSetRecoilState } from "recoil";
import authScreenAtom from "../atoms/authAtom";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function SignupCard() {
  const [showPassword, setShowPassword] = useState(false);
  const setAuthScreen = useSetRecoilState(authScreenAtom);
  const navigate = useNavigate();
  const [inputs, setInputs] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });
 const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (inputs.email.includes("@")) {
      const usernameFromEmail = "@" + inputs.email.split("@")[0];
      setInputs((prevInputs) => ({ ...prevInputs, username: usernameFromEmail }));
      
    } else {
      setInputs((prevInputs) => ({ ...prevInputs, username: "" }));
    }
  }, [inputs.email]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
     let finalInputs = { ...inputs };
    if (finalInputs.email && !finalInputs.username) {
        if (finalInputs.email.includes("@")) {
            finalInputs.username = "@" + finalInputs.email.split("@")[0];
        }
    }

    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";  // Env variable  "" (local proxy)

      const api = axios.create({
      baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",  // production or dev proxy
        withCredentials: true,
      });
    console.log(finalInputs.username);

      const result = await api.post("/auth/register", finalInputs);
      
      if (result.status === 200) {
        toast.success(result.data.message);
        navigate("/verify-otp", { state: { inputs: finalInputs } });
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error.response?.data?.errorMessage || "Signup failed due to a network error.";
      toast.error(errorMessage);
    }finally {
            setIsLoading(false);
        }
  };

  return (
    <Flex align={"center"} justify={"center"}>
      <Stack spacing={8} mx={"auto"} maxW={"lg"} py={12} px={6}>
        <Stack align={"center"}>
          <Heading fontSize={"4xl"} textAlign={"center"}>
            Sign Up
          </Heading>
        </Stack>
        <Box
          rounded={"lg"}
          bg={useColorModeValue("white", "gray.700")}
          boxShadow={"lg"}
          p={8}
        >
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Name</FormLabel>
              <Input
                type="text"
                onChange={(e) => setInputs({ ...inputs, name: e.target.value })}
                value={inputs.name}
              />
            </FormControl>
            
            <FormControl isRequired>
              <FormLabel>Email Address</FormLabel>
              <Input
                type="email"
                onChange={(e) => setInputs({ ...inputs, email: e.target.value })}
                value={inputs.email}
              />
            </FormControl>

            <FormControl isRequired display="none">
              <FormLabel>Username</FormLabel>
              <Input
                type="text"
                value={inputs.username}
                onChange={(e) => setInputs({ ...inputs, username: e.target.value })}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? "text" : "password"}
                  onChange={(e) => setInputs({ ...inputs, password: e.target.value })}
                  value={inputs.password}
                />
                <InputRightElement h={"full"}>
                  <Button
                    variant={"ghost"}
                    onClick={() => setShowPassword((showPassword) => !showPassword)}
                  >
                    {showPassword ? <ViewIcon /> : <ViewOffIcon />}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>
            <Stack spacing={10} pt={2}>
              <Button
                loadingText="Submitting"
                size="lg"
                bg={"blue.400"}
                color={"white"}
                _hover={{
                  bg: "blue.500",
                }}
                onClick={handleSignup}
              >
                Sign Up
              </Button>
            </Stack>
            <Stack pt={6}>
              <Text align={"center"}>
                Already have an account?{" "}
                <Link
                  color={"blue.400"}
                  onClick={() => {
                    setAuthScreen("login");
                  }}
                >
                  Sign In
                </Link>
              </Text>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Flex>
  );
}

export default SignupCard;
