import { useState } from "react";
import {
  Box,
  Button,
  Input,
  Heading,
  VStack,
  InputGroup,
  InputRightElement,
  IconButton,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
const brandGradient = "linear-gradient(135deg, #23ADE3 0%, #3FB07B 100%)";

  const handleReset = async () => {
    //  Validation
    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    if (password !== confirmPassword) {
      return toast.error("Passwords do not match");
    }

    try {
      setLoading(true);
      await api.post("/auth/reset-password", {
        newPassword: password,
      });

      toast.success("Password reset successful");
      navigate("/auth"); //  back to login
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="400px" mx="auto" mt="100px">
      <VStack spacing={5}>
        <Heading size="lg">Reset Password</Heading>

        {/*  New Password */}
        <InputGroup>
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <InputRightElement>
            <IconButton
              size="sm"
              variant="ghost"
              icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
            />
          </InputRightElement>
        </InputGroup>

        {/* Confirm Password */}
        <InputGroup>
          <Input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <InputRightElement>
            <IconButton
              size="sm"
              variant="ghost"
              icon={showConfirm ? <ViewOffIcon /> : <ViewIcon />}
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label="Toggle confirm password visibility"
            />
          </InputRightElement>
        </InputGroup>

        <Button
          w="full"
          colorScheme="purple"
          onClick={handleReset}
          isLoading={loading}
            bgGradient={brandGradient}
            color="white"
            _hover={{ borderColor: "gray.400" }}
                _focus={{ borderColor: "#23ADE3", boxShadow: "0 0 0 1px #23ADE3" }}
        >
          Reset Password
        </Button>
      </VStack>
    </Box>
  );
}
