
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Box, Container, Text, Flex, Spinner } from "@chakra-ui/react";
import { Toaster } from 'react-hot-toast';
// import UserPage from "./pages/UserPage";
import Header from "./components/Header";
// import PostPage from "./pages/PostPage";
import Homepage from "./pages/Homepage";
import Authpage from "./pages/Authpage";
import userAtom from "./atoms/userAtom";
// import UpdateProfile from "./pages/UpdateProfile";
// import CreatePost from "./components/CreatePost";
import PageNotFound from "./pages/PageNotFound";
import ChatPage from "./ChatPage";
// import SettingPage from "./pages/SettingPage";
import ProfilePage from "./pages/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage";


function App() {
  const user = useRecoilValue(userAtom);
  const setUser = useSetRecoilState(userAtom);
  const [loading, setLoading] = useState(true);
  const { pathname } = useLocation();

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const api = axios.create({
          baseURL: "/api/v1",
          withCredentials: true,
        });
        
        const response = await api.post("/auth/refresh-token");
        
        if (response.status === 200 && response.data.token) {
          const userResponse = await api.get("/auth/me");
          if (userResponse.status === 200 && userResponse.data.user) {
            setUser(userResponse.data.user);
          } else {
            setUser(null);
          }
        }
      } catch (error) {
        console.error("No active session found.", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUserSession();
  }, [setUser, pathname]);

  if (loading) {
    return (
      <Flex h="100vh" w="100vw" align="center" justify="center">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <>
     <Box position={"relative"}  w={"full"}>
     <Container maxW={pathname === '/' ? {base: "620px", md: "900px"} : "620px"}>
        <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
          
        <Routes>
          <Route
            path="/"
            element={user ? <Homepage  user={user}/> : <Navigate to="/auth" />}
          />
          <Route
            path="/auth"
            element={!user ? <Authpage /> : <Navigate to="/" />}
          />
          <Route path="/profile/:userId" element={user ? <ProfilePage /> : <Navigate to="/auth" />} />
          <Route path="/edit_profile/:userId" element={user ? <EditProfilePage /> : <Navigate to="/auth" />} />


          {/* <Route path="/:username/posts/:postId" element={<PostPage />} /> */}
          <Route
            path="/user/chat"
            element={user ? <ChatPage /> : <Navigate to="/auth" />}
          />
          {/* <Route
          path="/settings"
          element={user ? <SettingPage /> : <Navigate to="/auth" />}
        /> */}
          {/* 404 page Not Found for unknown Url */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Container>
     </Box>
    </>
  );
}

export default App;
