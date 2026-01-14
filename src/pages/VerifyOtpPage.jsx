import { useState } from "react";
import {
  Flex,
  Box,
  FormControl,
  FormLabel,
  Stack,
  Button,
  Heading,
  Text,
  Link,
} from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import axios from "axios";
import toast from "react-hot-toast";
import OtpInput from "../components/OtpInput";
import bgImage from "../assets/images/bg.png"; 

function VerifyOtpPage() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const setUser = useSetRecoilState(userAtom);
  const navigate = useNavigate();
  const location = useLocation();
const brandGradient = "linear-gradient(135deg, #23ADE3 0%, #3FB07B 100%)";

  const API_BASE = import.meta.env.VITE_API_URL || "";
  const inputs = location.state?.inputs;

  if (!inputs?.email) return null;

  const api = axios.create({
    baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
    withCredentials: true,
  });

  /* ===== LOGIC  ===== */
  const handleVerify = async () => {
    if (otp.length !== 6) {
      return toast.error("Please enter full OTP");
    }

    setLoading(true);
    try {
      const result = await api.post("/auth/verify-otp", {
        email: inputs.email,
        otp,
      });

      if (result.status === 201) {
        toast.success(result.data.message);
        setUser(result.data.user);
        navigate("/");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.errorMessage || "OTP verification failed.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    try {
      const result = await api.post("/auth/register", inputs);
      if (result.status === 200) {
        toast.success(result.data.message);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.errorMessage || "Failed to resend OTP.";
      toast.error(errorMessage);
    } finally {
      setResendLoading(false);
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
        <Stack spacing={6}>
          <Stack align="center">
            <Heading fontSize="2xl" color="black" textAlign="center">
              Verify OTP
            </Heading>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              A verification code has been sent to <br />
              <Text as="span" fontWeight="bold" color="black">{inputs.email}</Text>
            </Text>
          </Stack>

          <FormControl isRequired>
            <FormLabel fontSize="sm" color="gray.700" fontWeight="600" textAlign="center" mb={4}>
              OTP Code
            </FormLabel>
            <Flex justify="center">
               <OtpInput length={6} value={otp} onChange={setOtp} />
            </Flex>
          </FormControl>

          <Button
            w="full"
             bgGradient={brandGradient}
            color="white"
            _hover={{ borderColor: "gray.400" }}
                _focus={{ borderColor: "#23ADE3", boxShadow: "0 0 0 1px #23ADE3" }}
            isLoading={loading}
            isDisabled={otp.length !== 6}
            loadingText="Verifying..."
            onClick={handleVerify}
          >
            Verify
          </Button>

          <Text fontSize="sm" align="center" color="gray.600">
            Didn't receive the code?{" "}
            <Link
              color="#0067b8"
              fontWeight="bold"
              onClick={handleResendOtp}
              pointerEvents={resendLoading ? "none" : "auto"}
              _hover={{ textDecoration: "underline" }}
            >
              {resendLoading ? "Sending..." : "Resend OTP"}
            </Link>
          </Text>
        </Stack>
      </Box>
    </Flex>
  );
}

export default VerifyOtpPage;