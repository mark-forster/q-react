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
  Link,
  InputGroup,
  InputRightElement,
  Image,
  VStack,
} from "@chakra-ui/react";
import bgImage from "../assets/images/bg.png";
import logo from "../assets/images/logo.png";
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
const brandGradient = "linear-gradient(135deg, #23ADE3 0%, #3FB07B 100%)";
  /* ===== LOGIC  ===== */
  useEffect(() => {
    if (inputs.email.includes("@")) {
      const usernameFromEmail = "@" + inputs.email.split("@")[0];
      setInputs((prev) => ({ ...prev, username: usernameFromEmail }));
    } else {
      setInputs((prev) => ({ ...prev, username: "" }));
    }
  }, [inputs.email]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    let finalInputs = { ...inputs };
    if (finalInputs.email && !finalInputs.username) {
      finalInputs.username = "@" + finalInputs.email.split("@")[0];
    }
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const api = axios.create({
        baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
        withCredentials: true,
      });
      const result = await api.post("/auth/register", finalInputs);
      if (result.status === 200) {
        toast.success(result.data.message);
        navigate("/verify-otp", { state: { inputs: finalInputs } });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.errorMessage || "Signup failed.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
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
          {/* Header Section */}
          <VStack spacing={2} mb={1}>
            <Image src={logo} alt="Logo" boxSize="70px" objectFit="contain" />
            <Heading fontSize="2xl" color="black" fontWeight="800"
              bgGradient={brandGradient} 
              bgClip="text"
              letterSpacing="tight">
              Arakkha Chat
            </Heading>
           
          </VStack>

          <Stack spacing={4} w="full">
             <Text fontSize="md" color="gray.500" fontWeight="500">
              Create Account
            </Text>
            {/* Name Field */}
            <FormControl isRequired>
              <FormLabel fontSize="sm" color="gray.700" fontWeight="600">
                Name <Text as="span" color="red.500">*</Text>
              </FormLabel>
              <Input
                placeholder="Your name"
                h="45px"
                color="black"
                borderColor="gray.300"
                _hover={{ borderColor: "gray.400" }}
                _focus={{ borderColor: "#0067b8", boxShadow: "0 0 0 1px #0067b8" }}
                value={inputs.name}
                onChange={(e) => setInputs({ ...inputs, name: e.target.value })}
              />
            </FormControl>

            {/* Email Field */}
            <FormControl isRequired>
              <FormLabel fontSize="sm" color="gray.700" fontWeight="600">
                Email address <Text as="span" color="red.500">*</Text>
              </FormLabel>
              <Input
                type="email"
                placeholder="email@example.com"
                h="45px"
                color="black"
                borderColor="gray.300"
                _hover={{ borderColor: "gray.400" }}
                _focus={{ borderColor: "#0067b8", boxShadow: "0 0 0 1px #0067b8" }}
                value={inputs.email}
                onChange={(e) => setInputs({ ...inputs, email: e.target.value })}
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
                  _focus={{ borderColor: "#0067b8", boxShadow: "0 0 0 1px #0067b8" }}
                  value={inputs.password}
                  onChange={(e) => setInputs({ ...inputs, password: e.target.value })}
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
            </FormControl>

            <Button
              isLoading={isLoading}
              bgGradient={brandGradient}
              color="white"
              h="48px"
              fontSize="md"
              fontWeight="bold"
              mt={4}
              _hover={{ 
                opacity: 0.9, 
                transform: "translateY(-1px)",
                boxShadow: "0 4px 12px rgba(35, 173, 227, 0.3)"
              }}
              _active={{ transform: "translateY(0)" }}
              transition="all 0.2s"
              onClick={handleSignup}
            >
              Create
            </Button>

            <Text fontSize="sm" textAlign="center" color="gray.600" pt={2}>
              Already have an account?{" "}
              <Link
                color="#0067b8"
                fontWeight="700"
                onClick={() => setAuthScreen("login")}
                _hover={{ textDecoration: "underline" }}
              >
                Sign In
              </Link>
            </Text>
          </Stack>
        </VStack>
      </Box>
    </Flex>
  );
}

export default SignupCard;