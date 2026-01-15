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
  const [removingUserId, setRemovingUserId] = useState(null);
  const [leaving, setLeaving] = useState(false);
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
  // =========================
  // REALTIME GROUP UPDATE
  // =========================
  useEffect(() => {
    if (!enabled || !group?._id || !socket) return;

    const handleConversationUpdated = (updatedConv) => {
      if (String(updatedConv._id) !== String(group._id)) return;

      //  members realtime update
      if (updatedConv.participants) {
        setMembers(updatedConv.participants);
      }

      //  name realtime update
      if (updatedConv.name) {
        setNewName(updatedConv.name);
      }

      //  conversation list update
      setConversations((prev) =>
        prev.map((c) =>
          String(c._id) === String(updatedConv._id)
            ? { ...c, ...updatedConv }
            : c
        )
      );

      //  selected conversation update
      setSelectedConversation((prev) =>
        prev && String(prev._id) === String(updatedConv._id)
          ? { ...prev, ...updatedConv }
          : prev
      );
    };

    socket.on("conversationUpdated", handleConversationUpdated);

    return () => {
      socket.off("conversationUpdated", handleConversationUpdated);
    };
  }, [socket, group?._id, enabled]);
  // rename group
  const renameGroup = async () => {
    if (!newName.trim()) {
      return toast({ title: "Group name is required", status: "warning" });
    }

    const res = await api.put("/messages/group/rename", {
      conversationId: group._id,
      name: newName,
    });

    const full = res.data?.data;
    if (!full) return;

    // ✅ update conversation list
    setConversations((prev) =>
      prev.map((c) =>
        String(c._id) === String(full._id) ? { ...c, ...full } : c
      )
    );

    // ✅ update selected conversation
    setSelectedConversation((prev) =>
      prev && String(prev._id) === String(full._id)
        ? { ...prev, ...full }
        : prev
    );

    // ✅ update sidebar members
    setMembers(full.participants || []);

    toast({ title: "Group name updated", status: "success" });
  };

  // add member
  const addMember = async (userId) => {
    setAddingUser(true);

    try {
      const res = await api.put("/messages/group/add", {
        conversationId: group._id,
        userId,
      });

      const full = res.data?.data;
      if (full) {
        setMembers(full.participants || []);

        setConversations((prev) =>
          prev.map((c) =>
            String(c._id) === String(full._id) ? { ...c, ...full } : c
          )
        );

        setSelectedConversation((prev) =>
          prev && String(prev._id) === String(full._id)
            ? { ...prev, ...full }
            : prev
        );
      }
    } finally {
      setAddingUser(false);
    }
  };

  // remove member
  const removeMember = async (userId) => {
    setRemovingUserId(userId);

    try {
      const res = await api.put("/messages/group/remove", {
        conversationId: group._id,
        userId,
      });

      const full = res.data?.data;
      if (full) {
        setMembers(full.participants || []);

        setConversations((prev) =>
          prev.map((c) =>
            String(c._id) === String(full._id) ? { ...c, ...full } : c
          )
        );
      }
    } finally {
      setRemovingUserId(null);
    }
  };

  // leave group
  const leaveGroup = async () => {
    setLeaving(true);

    try {
      await api.put("/messages/group/leave", {
        conversationId: group._id,
      });
    } finally {
      setLeaving(false);
    }
  };

  return {
    loading,
    members,
    newName,
    setNewName,
    allUsers,
    addingUser,
    removingUserId,
    leaving,
    showAddSection,
    setShowAddSection,
    renameGroup,
    addMember,
    removeMember,
    leaveGroup,
  };
};
