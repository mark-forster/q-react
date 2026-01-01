// hooks/useGroupProfile.js
import { useEffect, useState } from "react";
import axios from "axios";
import { useRecoilValue, useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import {
  conversationsAtom,
  selectedConversationAtom,
} from "../atoms/messageAtom";
import { useSocket } from "../context/SocketContext";
import { useToast } from "@chakra-ui/react";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

export const useGroupProfile = (group, enabled = true) => {
  const toast = useToast();
  const currentUser = useRecoilValue(userAtom);
  const setConversations = useSetRecoilState(conversationsAtom);
  const setSelectedConversation = useSetRecoilState(selectedConversationAtom);
  const { socket } = useSocket();

  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [newName, setNewName] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [showAddSection, setShowAddSection] = useState(false);

  // load group data
  useEffect(() => {
    if (!enabled || !group?._id) return;

    setNewName(group.name || "");
    setMembers(group.participants || []);
    setLoading(true);

    api
      .get("/auth/users")
      .then((res) => {
        const list = res.data?.users || [];
        setAllUsers(list.filter((u) => u._id !== currentUser._id));
      })
      .finally(() => setLoading(false));
  }, [group?._id, enabled]);

  // rename group
  const renameGroup = async () => {
    if (!newName.trim()) {
      return toast({ title: "Group name is required", status: "warning" });
    }

    await api.put("/messages/group/rename", {
      conversationId: group._id,
      name: newName,
    });

    setConversations((prev) =>
      prev.map((c) =>
        c._id === group._id ? { ...c, name: newName } : c
      )
    );

    setSelectedConversation((prev) =>
      prev?._id === group._id ? { ...prev, name: newName } : prev
    );

    toast({ title: "Group name updated", status: "success" });
  };

  // add member
  const addMember = async (userId) => {
    setAddingUser(true);
    const res = await api.put("/messages/group/add", {
      conversationId: group._id,
      userId,
    });

    if (res.data?.user) {
      setMembers((prev) => [...prev, res.data.user]);
    }

    socket?.emit("joinConversationRoom", { conversationId: group._id });
    setAddingUser(false);
  };

  // remove member
  const removeMember = async (userId) => {
    await api.put("/messages/group/remove", {
      conversationId: group._id,
      userId,
    });
    setMembers((prev) => prev.filter((m) => m._id !== userId));
  };

  // leave group
  const leaveGroup = async () => {
    await api.put("/messages/group/leave", {
      conversationId: group._id,
    });

    setConversations((prev) =>
      prev.filter((c) => c._id !== group._id)
    );
    setSelectedConversation(null);
  };

  return {
    loading,
    members,
    newName,
    setNewName,
    allUsers,
    addingUser,
    showAddSection,
    setShowAddSection,
    renameGroup,
    addMember,
    removeMember,
    leaveGroup,
  };
};
