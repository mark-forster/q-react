import React from "react";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";

const PageNotFound = () => {
  const user = useRecoilValue(userAtom);
  return <div>404 Page Not Found</div>;
};

export default PageNotFound;
