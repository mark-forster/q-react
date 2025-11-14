// src/atoms/callAtom.js
import { atom } from "recoil";

// Local Storage မှ Call State ကို ရယူသော Helper Function
const getInitialCallState = () => {
    const storedState = localStorage.getItem("callState");
    if (storedState) {
        try {
            return JSON.parse(storedState);
        } catch (e) {
            console.error("Error parsing callState from localStorage", e);
            // Parsing error ရှိရင် Default Value ပြန်ပေးပါ
        }
    }
    // Default State
    return {
        isCallActive: false,
        currentCallType: "audio",
        roomID: null,
        callerID: null,
        opponentID: null,
    };
};

// Call ၏ အခြေအနေအားလုံးကို သိမ်းဆည်းမည့် Global State
export const callStateAtom = atom({
    key: "callStateAtom",
    default: getInitialCallState(),
});