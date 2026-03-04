export const LABEL_COLORS = [
  { name: "gray",   bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
  { name: "blue",   bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  { name: "green",  bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  { name: "red",    bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
  { name: "yellow", bg: "#fefce8", text: "#a16207", border: "#fef08a" },
  { name: "purple", bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
];

export const colorStyle = (colorName) =>
  LABEL_COLORS.find((c) => c.name === colorName) || LABEL_COLORS[0];