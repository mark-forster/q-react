import { atom } from "recoil";

// saving all Conversation list  atom
export const conversationsAtom = atom({
  key: "conversationsAtom",
  default: [],
});

// save selected conversation  atom
export const selectedConversationAtom = atom({
  key: "selectedConversationAtom",
 default: null,

});

// save message from current chat box  atom
export const messagesAtom = atom({
  key: "messagesAtom",
  default: [],
});

// Existing Message Atom
export const editingMessageAtom = atom({
  key: "editingMessageAtom",
  default: null,
});

export const currentlyPlayingAudioIdAtom = atom({
  key: 'currentlyPlayingAudioIdAtom',
  default: null, // Default is null, meaning no audio is playing
});