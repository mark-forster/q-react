import { useState } from "react";
import { useRecoilState } from "recoil";
import { messagesAtom } from "../atoms/messageAtom";
import axios from "axios";
import toast from "react-hot-toast";

// API
const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

const useDeleteMessage = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useRecoilState(messagesAtom);

  const deleteMessage = async (messageId) => {
    setLoading(true);
    // optimistic UI (for components that use messagesAtom)
    const original = messages;
    setMessages((prev) => prev.filter((m) => m._id !== messageId));

    try {
      const res = await api.delete(`/messages/message/${messageId}`);
      if (res?.status === 200) {
        toast.success("Message deleted!");
        // Server will emit "messageDeleted". Components that listen locally (MessageContainer) will also update.
      } else {
        setMessages(original);
        toast.error(res?.data?.message || "Failed to delete message");
      }
    } catch (error) {
      setMessages(original);
      console.error("Failed to delete message:", error);
      toast.error("An error occurred. Could not delete message.");
    } finally {
      setLoading(false);
    }
  };

  return { deleteMessage, loading };
};

export default useDeleteMessage;
