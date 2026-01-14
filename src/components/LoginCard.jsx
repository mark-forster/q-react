import {
  Flex,
  Box,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Button,
  Heading,
  Text,
  Link,
  Image,
  VStack,
} from "@chakra-ui/react";
import bgImage from "../assets/images/bg.png";
import logo from "../assets/images/logo.png"; 

import { useState } from "react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useSetRecoilState } from "recoil";
import authScreenAtom from "../atoms/authAtom";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import userAtom from "../atoms/userAtom";

function LoginCard() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const setAuthScreen = useSetRecoilState(authScreenAtom);
  const setUser = useSetRecoilState(userAtom);
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    email: "",
    password: "",
  });

  const brandGradient = "linear-gradient(135deg, #23ADE3 0%, #3FB07B 100%)";

  /* ===== LOGIC  ===== */
  const handleLogin = async (e) => {
    const API_BASE = import.meta.env.VITE_API_URL || "";
    e.preventDefault();
    setLoading(true);
    try {
      const api = axios.create({
        baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
        withCredentials: true,
      });

      const result = await api.post("/auth/signIn", inputs);
      const user = result.data.user;

      setUser(user);
      
      toast.success(result.data.message);
      navigate("/");
    } catch (error) {
      console.error(error);
      const errorMessage = error.response?.data?.message || "Login failed due to a network error.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bgImage={`url(${bgImage})`}
      bgSize="cover"
      bgPosition="center"
    >
      <Box
        w="full"
        maxW="420px"
        bg="rgba(255, 255, 255, 0.95)" 
        px={10}
        py={12}
        borderRadius="2xl"
        boxShadow="0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      >
        <VStack spacing={6}>
          {/* Header*/}
          <VStack spacing={2} mb={2}>
            <Image src={logo} alt="Logo" boxSize="70px" objectFit="contain" />
            <Heading 
              fontSize="2xl" 
              fontWeight="800"
              bgGradient={brandGradient} 
              bgClip="text"
              letterSpacing="tight"
            >
              Arakkha Chat
            </Heading>
          
          </VStack>

          <Stack spacing={4} w="full">
            {/* Email Field */}
            <FormControl isRequired>
              <FormLabel fontSize="sm" color="gray.700" fontWeight="600">
                Email Address <Text as="span" color="red.500">*</Text>
              </FormLabel>
              <Input
                type="email"
                placeholder="email@example.com"
                h="45px"
                color="black"
                borderColor="gray.300"
                _hover={{ borderColor: "gray.400" }}
                _focus={{ borderColor: "#23ADE3", boxShadow: "0 0 0 1px #23ADE3" }}
                onChange={(e) =>
                  setInputs({ ...inputs, email: e.target.value })
                }
                value={inputs.email}
              />
            </FormControl>

            {/* Password Field */}
            <FormControl isRequired>
              <FormLabel fontSize="sm" color="gray.700" fontWeight="600">
                Password <Text as="span" color="red.500">*</Text>
              </FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  h="45px"
                  color="black"
                  borderColor="gray.300"
                  _hover={{ borderColor: "gray.400" }}
                  _focus={{ borderColor: "#23ADE3", boxShadow: "0 0 0 1px #23ADE3" }}
                  onChange={(e) =>
                    setInputs({ ...inputs, password: e.target.value })
                  }
                  value={inputs.password}
                />
                <InputRightElement h="full">
                  <Button
                    size="sm"
                    variant="ghost"
                    _hover={{ bg: "transparent" }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <ViewIcon color="gray.500" /> : <ViewOffIcon color="gray.500" />}
                  </Button>
                </InputRightElement>
              </InputGroup>
              
              <Text align="right" mt={2}>
                <Link
                  fontSize="xs"
                  color="#0067b8"
                  fontWeight="bold"
                  onClick={() => navigate("/forgot-password")}
                  _hover={{ textDecoration: "underline" }}
                >
                  Forgot password?
                </Link>
              </Text>
            </FormControl>

            {/*  Login Button */}
            <Button
              isLoading={loading}
              bgGradient={brandGradient}
              color="white"
              h="48px"
              fontSize="md"
              fontWeight="bold"
              mt={2}
              _hover={{ 
                opacity: 0.9, 
                transform: "translateY(-1px)",
                boxShadow: "0 4px 12px rgba(35, 173, 227, 0.3)" 
              }}
              _active={{ transform: "translateY(0)" }}
              transition="all 0.2s"
              onClick={handleLogin}
            >
              Sign In
            </Button>

            <Text fontSize="sm" textAlign="center" color="gray.600" pt={2}>
              Don't have an account?{" "}
              <Link
                color="#0067b8"
                fontWeight="bold"
                onClick={() => setAuthScreen("signup")}
                _hover={{ textDecoration: "underline" }}
              >
                Sign Up
              </Link>
            </Text>
          </Stack>
        </VStack>
      </Box>
    </Flex>
  );
}

export default LoginCard;