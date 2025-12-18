import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import axios from "axios";
import { useRef } from "react";

const ZEGO_APP_ID = 1459447910;
const API_BASE = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

export default function useWebRTC(socket) {
  const zegoInstanceRef = useRef(null);

  const cleanupZegoCall = () => {
    try {
      zegoInstanceRef.current?.destroy();
    } catch (e) {
      console.warn("Zego destroy failed:", e);
    }
    zegoInstanceRef.current = null;

    const container = document.getElementById("zego-call-container");
    if (container) container.innerHTML = "";
  };

  const startUIKitCall = async ({
    roomID,
    userID,
    userName,
    callType,
    setNetworkQuality,
    setPermissionsOK,
    toast,
    endCallCallback,
    setIsMuted,
    setIsVideoOff,
  }) => {
    try {
      await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });

      setPermissionsOK(true);

      const { data } = await api.post("/zego/token", { roomID, userID });

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
        ZEGO_APP_ID,
        data.token,
        roomID,
        userID,
        userName
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zegoInstanceRef.current = zp;

      const container = document.getElementById("zego-call-container");
      if (!container) throw new Error("Missing Zego container");

      zp.joinRoom({
        container,
        scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },

        // disable Zego’s own popups / dialogs
        showPreJoinView: false,
        showLeavingView: false,
        showUserList: false,
        showTextChat: false,
        showRoomDetailsButton: false,
        showMinimizeButton: false,
        showLeaveRoomConfirmDialog: false,

        turnOnCameraWhenJoining: callType === "video",
        turnOnMicrophoneWhenJoining: true,

        onLeaveRoom: () => {
          endCallCallback?.();

          const receiver = roomID
            .split("_")
            .find((id) => String(id) !== String(userID));

          if (receiver && socket) {
            socket.emit("endCall", { to: receiver, roomID });
          }
        },

        onNetworkQualityStatus: (q) => {
          if (q.level <= 2) setNetworkQuality("poor");
          else if (q.level <= 4) setNetworkQuality("medium");
          else setNetworkQuality("good");
        },

        onLocalUserMediaStateUpdate: ({ type, state }) => {
          if (type === "audio") setIsMuted(state === "Mute");
          if (type === "video") setIsVideoOff(state === "Off");
        },
      });
    } catch (err) {
      console.error("Call error:", err);

      if (
        err.name === "NotAllowedError" ||
        err.name === "NotFoundError"
      ) {
        setPermissionsOK(false);
      }

      toast?.({
        title: "Call Failed",
        description: err.message,
        status: "error",
      });

      cleanupZegoCall();
    }
  };

  const toggleAudio = (on) =>
    zegoInstanceRef.current?.useLocalUser?.setMicrophone(on);

  const toggleVideo = (on) =>
    zegoInstanceRef.current?.useLocalUser?.setCamera(on);

  return {
    startUIKitCall,
    cleanupZegoCall,
    toggleAudio,
    toggleVideo,
    zegoInstanceRef,
  };
}