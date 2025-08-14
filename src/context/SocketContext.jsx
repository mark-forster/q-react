import { createContext, useContext, useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";

const SocketContext = createContext();
export const useSocket = () => useContext(SocketContext);

export const SocketContextProvider = ({ children }) => {
  const user = useRecoilValue(userAtom);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user?._id) return;

    // connect to backend; use full URL in production
    const url = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080";
    const s = io(url, {
      query: { userId: user._id },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = s;
    setSocket(s);

    s.on("connect", () => {
      console.log("socket connected:", s.id);
    });

    s.on("getOnlineUsers", (users) => {
      setOnlineUsers(users);
    });

    // error handlers
    s.on("connect_error", (err) => {
      console.error("Socket connect_error:", err.message);
    });

    return () => {
      s.off("getOnlineUsers");
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
