import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import axios from "axios";
import toast from "react-hot-toast";

let zegoInstance = null;
let localMediaStream = null;

const ZEGO_APP_ID = 281042663;
const API_BASE = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

/* -----------------------------------------------------------
   REMOVE ALL DIALOG BOXES (UI + shadow DOM)
------------------------------------------------------------ */
const removeAllZegoDialogs = () => {
  // Add more selectors just in case
  document.querySelectorAll(`
    div[class*="zego-dialog"],
    div[class*="zego-modal"],
    div[class*="zego-confirm"],
    div[class*="zego-leave"],
    div[class*="leaveRoom"],
    div[class*="room-content_leaveRoomDialog__"],
    div[class*="zego-uikit-dialog"],
    div[class*="zego-dialog-wrapper"],
    div[class*="zp_modal_container"],
    div[class*="zp_common_dialog"]
  `).forEach(el => el.remove());
};

/* Remove Shadow DOM dialogs (used in Zego 2.17.x) */
const killShadowDialogs = () => {
  document.querySelectorAll("zego-uikit-dialog, zego-dialog").forEach(node => {
    if (node.shadowRoot) node.shadowRoot.innerHTML = "";
    node.remove();
  });
};

/* Repeated removal (Zego recreates 6–10 times in v2.17) */
const forceRemoveDialogsRepeatedly = () => {
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      removeAllZegoDialogs();
      killShadowDialogs();
    }, i * 100);
  }
};

/* -----------------------------------------------------------
   DISABLE INTERNAL CONFIRM (Zego 2.17 new APIs)
------------------------------------------------------------ */
const disableZegoConfirmDialogs = () => {
  try {
    if (zegoInstance?._pluginEngine?._zgEx) {
      const ex = zegoInstance._pluginEngine._zgEx;

      // Old confirm APIs
      ex.showDialog = () => null;
      ex.showConfirm = () => null;
      ex.showLeavingView = () => null;
      ex.showResumeDialog = () => null; // Added

      // Prebuilt leave confirm APIs
      ex.showLeaveRoomDialog = () => null;
      ex.showLeaveRoomConfirmDialog = () => null;

      // New 2.17 service
      if (ex._commonDialogService) {
        ex._commonDialogService.show = () => {};
        ex._commonDialogService.confirm = () => Promise.resolve(true);
        ex._commonDialogService.showConfirm = () => Promise.resolve(true);
      }

      // New 2.17 confirm hook - CRITICAL
      ex._leaveRoomConfirm = () => Promise.resolve(true);

      ex._showCommonDialog = () => null;
      ex._commonDialog = () => null;
      
      // Also override the destroy method if possible to prevent cleanup dialogs
      const originalDestroy = zegoInstance.destroy;
      zegoInstance.destroy = function(...args) {
          disableZegoConfirmDialogs(); // Call again just before destruction
          return originalDestroy.apply(this, args);
      }
    }
  } catch (err) {
    console.warn("Failed to disable Zego confirms:", err);
  }
};

/* -----------------------------------------------------------
   CLEANUP AND LEAVE CALL
------------------------------------------------------------ */
const cleanupZegoCall = () => {
  // Ensure dialogs are disabled immediately before destroying
  disableZegoConfirmDialogs(); 
  
  if (zegoInstance) {
    try {
      zegoInstance.destroy();
    } catch {
      // Sometimes destroy fails, force cleanup
    }
    zegoInstance = null;
  }

  if (localMediaStream) {
    localMediaStream.getTracks().forEach((t) => t.stop());
    localMediaStream = null;
  }

  // Remove the container content after cleanup
  const container = document.getElementById("zego-call-container");
  if (container) container.innerHTML = "";

  forceRemoveDialogsRepeatedly(); // Final forceful cleanup
};

const leaveZegoCall = () => {
  cleanupZegoCall();
  return true;
};

/* -----------------------------------------------------------
   MAIN HOOK EXPORT
------------------------------------------------------------ */
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
      if (!data?.token) throw new Error("Token failed");

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
        ZEGO_APP_ID,
        data.token,
        roomID,
        userID,
        userName
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zegoInstance = zp;

      const container = document.getElementById("zego-call-container");
      if (!container) {
        toast.error("Call container missing");
        return;
      }

      zp.joinRoom({
        container,
        scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },

        turnOnCameraWhenJoining: callType === "video",
        turnOnMicrophoneWhenJoining: true,
        showPreJoinView: false,

        // Disable dialogs in configuration
        sharedConfigs: {
          showLeaveRoomDialog: false,
          showLeaveRoomConfirmDialog: false,
        },

        advancedConfig: {
          showLeaveRoomDialog: false,
          showLeaveRoomConfirmDialog: false,
          showResumeDialog: false,
          showLeavingView: false,
        },

        onJoinRoom: () => {
          try {
            const stream = zp.getLocalStream();
            if (stream) localMediaStream = stream;
          } catch {}

          // Disable internal APIs and remove stray dialogs immediately after joining
          disableZegoConfirmDialogs();
          forceRemoveDialogsRepeatedly();
        },

        onLeaveRoom: () => {
          // This fires when Zego's internal logic initiates leaving
          cleanupZegoCall();
          endCallCallback && endCallCallback();
        },
      });

      /* Override hangup button (v2.17 generates dynamic components) - CRITICAL */
      setTimeout(() => {
        document.querySelectorAll("button").forEach(btn => {
          // Check for 'Leave' or 'Hang up' text in multiple languages/cases
          const btnText = btn.innerText.toLowerCase();
          if (btnText.includes("leave") || btnText.includes("hang up") || btnText.includes("end")) {
            // Apply the direct hangup logic only if it hasn't been applied (to prevent double clicks)
            if (!btn.hasAttribute('data-zego-override')) {
                btn.onclick = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  leaveZegoCall(); // Direct call to our cleanup logic
                  return false;
                };
                btn.setAttribute('data-zego-override', 'true'); // Mark as overridden
            }
          }
        });

        killShadowDialogs(); // Final cleanup after components are rendered
      }, 1200); // Increased delay slightly for better component rendering

    } catch (error) {
      console.error("Call init error:", error);
      toast.error("Failed to init call");
      cleanupZegoCall();
    }
  };

  return { startUIKitCall, cleanupZegoCall, leaveZegoCall };
}