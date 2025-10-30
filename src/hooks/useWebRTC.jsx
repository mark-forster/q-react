import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import axios from "axios";
import toast from "react-hot-toast";

// ⚠️ Replace with your actual App ID
const ZEGO_APP_ID = 153980135;
const API_BASE = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

/**
 * Custom hook for handling Zego UIKit calls.
 */
export default function useWebRTC() {
  const startUIKitCall = async ({
    roomID,
    userID,
    userName,
    callType,
    endCallCallback,
  }) => {
    try {
      // 1️⃣ Request Zego token from backend
      const { data } = await api.post("/zego/token", { roomID, userID });
      if (!data?.token) throw new Error("Failed to get Zego token.");

      // 2️⃣ Generate UIKit token
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
        ZEGO_APP_ID,
        data.token,
        roomID,
        userID,
        userName
      );

      // 3️⃣ Create Zego UIKit instance
      const zp = ZegoUIKitPrebuilt.create(kitToken);

      // 4️⃣ Get container
      const container = document.getElementById("zego-call-container");
      if (!container) {
        toast.error("Zego container not found in DOM.");
        return;
      }

      // 5️⃣ Join Zego Room (Main config)
      zp.joinRoom({
  container,
  scenario: {
    mode:
      callType === "video"
        ? ZegoUIKitPrebuilt.VideoConference
        : ZegoUIKitPrebuilt.OneONoneCall,
  },
  turnOnCameraWhenJoining: callType === "video",
  turnOnMicrophoneWhenJoining: true,
  showScreenSharingButton: false,
  showPreJoinView: false,
  showRoomTimer: true,
  showTextChat: false,
  showUserList: false,
  showLeavingView: false,
  showNonVideoView: false,
  advancedConfig: {
    showLeaveRoomDialog: false,
    showResumeDialog: false,
  },
  onLeaveRoom: () => {
    container.innerHTML = "";
    if (endCallCallback) endCallCallback();
  },
});

// ⛔ Force remove any lingering leave dialogs
setTimeout(() => {
  document
    .querySelectorAll('div[class*="zego-leave-dialog"], div[class*="zego-leave-room-dialog"]')
    .forEach((el) => el.remove());
}, 1000);


      console.log(`[ZegoUIKit] Joined ${callType} call, Room: ${roomID}`);
    } catch (err) {
      console.error("[ZegoUIKit] Call error:", err);
      toast.error("Failed to start call. Please try again.");
    }
  };

  return { startUIKitCall };
}
