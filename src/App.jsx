import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRecoilValue, useSetRecoilState } from "recoil";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  HashRouter as Router,
} from "react-router-dom";
import { Box, Container, Flex, Spinner } from "@chakra-ui/react";
import { Toaster } from "react-hot-toast";
import Header from "./components/Header";
import Homepage from "./pages/Homepage";
import Authpage from "./pages/Authpage";
import userAtom from "./atoms/userAtom";
import PageNotFound from "./pages/PageNotFound";
import ChatPage from "./ChatPage";
import ProfilePage from "./pages/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import CallPage from "./components/CallPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import VerifyResetOtpPage from "./pages/VerifyResetOtpPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
// Create a single axios instance for the entire application.
const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

function App() {
  const user = useRecoilValue(userAtom);
  const setUser = useSetRecoilState(userAtom);
  const [loading, setLoading] = useState(true);
  const { pathname } = useLocation();

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        await api.post("/auth/refresh-token");

        const userResponse = await api.get("/auth/me");
        setUser(userResponse.data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUserSession();
  }, []);

  if (loading) {
    return (
      <Flex h="100vh" w="100vw" align="center" justify="center">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <>
      <Box position={"relative"} w={"full"}>
        <Toaster position="top-center" toastOptions={{ duration: 2000 }} />

        <Routes>
          <Route
            path="/"
            element={user ? <Homepage user={user} /> : <Navigate to="/auth" />}
          />
          <Route
            path="/auth"
            element={!user ? <Authpage /> : <Navigate to="/" />}
          />
          <Route
            path="/profile/:userId"
            element={user ? <ProfilePage /> : <Navigate to="/auth" />}
          />
          <Route
            path="/edit_profile/:userId"
            element={user ? <EditProfilePage /> : <Navigate to="/auth" />}
          />
          <Route
            path="/user/chat"
            element={user ? <ChatPage /> : <Navigate to="/auth" />}
          />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/call/:roomID" element={<CallPage />} />
          <Route path="*" element={<PageNotFound />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-reset-otp" element={<VerifyResetOtpPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </Box>
    </>
  );
}

export default App;
