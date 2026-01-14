import { useState } from "react";
import { Box, Button, Heading, VStack, Flex, Text, Link } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import OtpInput from "../components/OtpInput";
import bgImage from "../assets/images/bg.png";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

export default function VerifyResetOtpPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
const brandGradient = "linear-gradient(135deg, #23ADE3 0%, #3FB07B 100%)";

  if (!state?.email) return null;

  /* ===== LOGIC ===== */
  const handleVerify = async () => {
    if (otp.length !== 6) return toast.error("Enter full OTP");

    try {
      setLoading(true);
      await api.post("/auth/verify-reset-otp", {
        email: state.email,
        otp,
      });
      toast.success("OTP verified");
      navigate("/reset-password", { state: { email: state.email, otp } }); 
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP");
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
        bg="white"
        px={10}
        py={10}
        borderRadius="xl"
        boxShadow="0 12px 28px rgba(0,0,0,0.12)"
      >
        <VStack spacing={6}>
          <Heading size="lg" color="black">Verify OTP</Heading>
          
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Enter the 6-digit code sent to your email to reset your password.
          </Text>

          <Box py={2}>
            <OtpInput length={6} value={otp} onChange={setOtp} />
          </Box>

          <Button
            w="full"
            bgGradient={brandGradient}
            color="white"
            _hover={{ borderColor: "gray.400" }}
                _focus={{ borderColor: "#23ADE3", boxShadow: "0 0 0 1px #23ADE3" }}
            isDisabled={otp.length !== 6}
            isLoading={loading}
            onClick={handleVerify}
          >
            Verify & Continue
          </Button>

          <Link
            fontSize="sm"
            color="gray.500"
            onClick={() => navigate(-1)}
            _hover={{ color: "black" }}
          >
            Go Back
          </Link>
        </VStack>
      </Box>
    </Flex>
  );
}