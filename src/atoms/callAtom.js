// src/atoms/callAtom.js
import { atom } from "recoil";

const getInitialCallState = () => {
    const storedState = localStorage.getItem("callState");
    if (storedState) {
        try {
            return JSON.parse(storedState);
        } catch (e) {
            console.error("Error parsing callState from localStorage", e);
        }
    }
    return {
        isCallActive: false,
        currentCallType: "audio",
        roomID: null,
        callerID: null,
        opponentID: null,
    };
};

export const callStateAtom = atom({
    key: "callStateAtom",
    default: getInitialCallState(),
});

