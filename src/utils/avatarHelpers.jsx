// utils/avatarHelpers.js
// Telegram-style Initials + Stable Color Picker

export const getInitials = (name = "", username = "") => {
  const base = name || username || "";
  if (!base) return "U";

  const parts = base.trim().split(" ");

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
};

// Profile colors (Telegram-style)
const avatarColors = [
  "#6C5CE7",
  "#0984E3",
  "#00B894",
  "#E17055",
  "#D63031",
  "#6D214F",
  "#1B9CFC",
  "#55E6C1",
];

export const getAvatarColor = (text = "") => {
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  return avatarColors[Math.abs(hash % avatarColors.length)];
};
