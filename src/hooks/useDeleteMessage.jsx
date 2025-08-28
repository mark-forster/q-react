// hooks/useDeleteMessage.js
import { useState } from "react";
import { useSetRecoilState } from "recoil";
import { conversationsAtom, messagesAtom } from "../atoms/messageAtom";
import toast from "react-hot-toast";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

const useDeleteMessage = () => {
  const [loading, setLoading] = useState(false);
  const setMessages = useSetRecoilState(messagesAtom);
  const setConversations = useSetRecoilState(conversationsAtom);

  const deleteMessage = async (messageId, deleteForEveryone) => {
    setLoading(true);
    try {
      if (deleteForEveryone) {
        await api.delete(`/messages/message/${messageId}`);
        toast.success("Message deleted for everyone.");
      } else {
        await api.delete(`/messages/message/for-me/${messageId}`);
        toast.success("Message deleted for you.");
      }

      // Update the messages state locally to remove the deleted message
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg._id !== messageId)
      );

      // Check if the last message in a conversation was deleted and update the conversation list
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.lastMessage && conv.lastMessage._id === messageId) {
            return { ...conv, lastMessage: { text: "Message deleted" } };
          }
          return conv;
        })
      );
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error(error?.response?.data?.error || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return { deleteMessage, loading };
};

export default useDeleteMessage;