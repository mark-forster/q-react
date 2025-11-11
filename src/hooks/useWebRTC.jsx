import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import axios from "axios";
import toast from "react-hot-toast";

const ZEGO_APP_ID = 281042663;
const API_BASE = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

export default function useWebRTC() {
  const startUIKitCall = async ({
    roomID,
    userID,
    userName,
    callType,
    endCallCallback,
  }) => {
    try {
      const { data } = await api.post("/zego/token", { roomID, userID });
      if (!data?.token) throw new Error("Failed to get Zego token.");

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
        ZEGO_APP_ID,
        data.token,
        roomID,
        userID,
        userName
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      const container = document.getElementById("zego-call-container");
      if (!container) {
        toast.error("Zego container not found in DOM.");
        return;
      }

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
          showLeaveRoomConfirmDialog: false,
          showResumeDialog: false,
          showLeavingView: false,
          autoLeaveAfterHostLeft: true,
        },

        onLeaveRoom: () => {
          setTimeout(() => {
            const currentContainer = document.getElementById("zego-call-container");
            if (currentContainer) currentContainer.innerHTML = "";
            if (endCallCallback) endCallCallback();
          }, 200); // MODIFIED: Increased delay for Zego cleanup
        },
      });

      // Remove leftover Zego dialogs (safety)
      const removeDialogs = () => {
        document
          .querySelectorAll(
            'div[class*="zego-leave-dialog"], div[class*="zego-leave-room-dialog"], div[class*="zego-dialog"], div[class*="zego-modal"]'
          )
          .forEach((el) => el.remove());
      };

      // First cleanup attempt
      setTimeout(removeDialogs, 1000);

      // Watch for dynamically inserted dialogs
      const observer = new MutationObserver(() => removeDialogs());
      observer.observe(document.body, { childList: true, subtree: true });

      // Override any built-in Leave button to skip confirm
      setTimeout(() => {
        const leaveButtons = document.querySelectorAll('button[class*="zego-leave-btn"]');
        leaveButtons.forEach((btn) => {
          btn.onclick = () => {
            observer.disconnect();
            zp.leaveRoom();
            // Note: endCallCallback is called via onLeaveRoom
          };
        });
      }, 2000);

      console.log(`[ZegoUIKit] Joined ${callType} call, Room: ${roomID}`);
    } catch (err) {
      console.error("[ZegoUIKit] Call error:", err);
      toast.error("Failed to start call. Please try again.");
    }
  };

  return { startUIKitCall };
}