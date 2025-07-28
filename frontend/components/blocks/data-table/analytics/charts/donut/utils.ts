// utils.ts

export const colorMap: Record<string, string> = {
  // Add these lines:
  info: "#3B82F6", // a nice Tailwind-like blue
  primary: "#6366F1", // an indigo or brand color

  emerald: "rgb(16, 185, 129)",
  gray: "rgb(107, 114, 128)",
  amber: "rgb(245, 158, 11)",
  red: "rgb(239, 68, 68)",
  blue: "rgb(59, 130, 246)",
  purple: "rgb(139, 92, 246)",
  pink: "rgb(236, 72, 153)",
  indigo: "rgb(99, 102, 241)",
  green: "rgb(34, 197, 94)",
  yellow: "rgb(234, 179, 8)",
  orange: "rgb(249, 115, 22)",
  teal: "rgb(20, 184, 166)",
  cyan: "rgb(6, 182, 212)",
  lime: "rgb(132, 204, 22)",
};

export const getColor = (color: string): string => {
  return colorMap[color] || color;
};
