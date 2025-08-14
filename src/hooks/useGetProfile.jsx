import React, { useState } from "react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
const useGetProfile = () => {
  const [user, setUser] = useState(null);
  const { username } = useParams();
  useEffect(() => {
    const getUser = async () => {
      const response = await axios.get(`/api/v1/users/profile/${username}`);
      if (response.data.errorMessage) {
        return null;
      }
      if(response.data.user.isFrozen){
        setUser(null);
        return;
      }
      setUser(response.data.user);
    };
    getUser();
  }, [username]);

  return { user };
};

export default useGetProfile;
