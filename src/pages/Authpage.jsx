import React from "react";
import SignupCard from "../components/SignupCard";
import LoginCard from "../components/LoginCard";
import { useRecoilValue } from "recoil";
import authScreenAtom from "../atoms/authAtom";
const Authpage = () => {
  const authScreenState = useRecoilValue(authScreenAtom);
  // useSetRecoilState(authScreenAtom);
  return (
    <>
      {/* <SignupCard /> */}
      {authScreenState === "login" ? <LoginCard /> : <SignupCard />}
    </>
  );
};

export default Authpage;
