import { useState } from "react";
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
} from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import axios from "axios";
import toast from "react-hot-toast";

function VerifyOtpPage() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const[resendLoading,setResendLoading]= useState(false);
  const setUser = useSetRecoilState(userAtom);
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE = import.meta.env.VITE_API_URL || "";  // Env variable  "" (local proxy )

  const inputs = location.state?.inputs;
console.log(inputs);
  const handleVerify = async () => {
    setLoading(true);
    try {
      const api = axios.create({
      baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",  // production or dev proxy
        withCredentials: true,
      });

      // OTP  inputs backend 
      const result = await api.post("/auth/verify-otp", {
       email: inputs.email,
        otp:otp
      });

      if (result.status === 201) {
        toast.success(result.data.message);
        setUser(result.data.user);
        navigate("/");
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error.response?.data?.errorMessage || "OTP verification failed.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
 const handleResendOtp = async () => { // Resend logic
    setResendLoading(true);
    try {
      const api = axios.create({
      baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",  // production or dev proxy
        withCredentials: true,
      });
      // Signup page 
      const result = await api.post("/auth/register", inputs);
      
      if (result.status === 200) {
        toast.success(result.data.message);
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error.response?.data?.errorMessage || "Failed to resend OTP.";
      toast.error(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };


  return (
    <Flex align={"center"} justify={"center"}>
      <Stack spacing={8} mx={"auto"} maxW={"lg"} py={12} px={6}>
        <Stack align={"center"}>
          <Heading fontSize={"4xl"} textAlign={"center"}>
            Verify OTP
          </Heading>
          <Text fontSize={"lg"} color={"gray.600"}>
            A verification code has been sent to your email.
          </Text>
        </Stack>
        <Box
          rounded={"lg"}
          bg={useColorModeValue("white", "gray.700")}
          boxShadow={"lg"}
          p={8}
        >
          <Stack spacing={4}>
            <FormControl id="otp" isRequired>
              <FormLabel>OTP Code</FormLabel>
              <Input
                type="text"
                onChange={(e) => setOtp(e.target.value)}
                value={otp}
              />
            </FormControl>
            <Stack spacing={10}>
              <Button
                bg={"blue.400"}
                color={"white"}
                _hover={{
                  bg: "blue.500",
                }}
                isLoading={loading}
                loadingText="Verifying..."
                onClick={handleVerify}
              >
                Verify
              </Button>
            </Stack>
            <Stack pt={6}>
              <Text align={"center"}>
                Didn't receive the code?{" "}
                <Link
                  color={"blue.400"}
                  isLoading={resendLoading}
                  onClick={handleResendOtp}
                >
                  Resend OTP
                </Link>
              </Text>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </Flex>
  );
}

export default VerifyOtpPage;
