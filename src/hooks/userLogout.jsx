import React from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
const userLogout = () => {
  const setUser = useSetRecoilState(userAtom);
  const logout = async () => {
    try {
      const result = await axios.post("/api/v1/auth/signOut");
      if (result.error) {
        toast.error(result.error.message);
        return 0; // return 0 to stop the function execution
      }
      localStorage.removeItem("user");
      setUser(null);
      toast.success(result.data.message);
    } catch (error) {
      console.log(error);
    }
  };
  return logout;
};

export default userLogout;
