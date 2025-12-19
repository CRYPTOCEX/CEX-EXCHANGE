"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { TagConfig } from "../types";

interface HeroTagProps {
  config: TagConfig;
  theme?: {
    primary?: string;
    secondary?: string;
  };
  animate?: boolean;
}

// Color map for common theme colors
const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  primary: {
    bg: "rgba(var(--primary-rgb, 20, 184, 166), 0.1)",
    border: "rgba(var(--primary-rgb, 20, 184, 166), 0.2)",
    text: "var(--primary)",
  },
  teal: {
    bg: "rgba(20, 184, 166, 0.1)",
    border: "rgba(20, 184, 166, 0.2)",
    text: "#0f766e",
  },
  cyan: {
    bg: "rgba(6, 182, 212, 0.1)",
    border: "rgba(6, 182, 212, 0.2)",
    text: "#0891b2",
  },
  blue: {
    bg: "rgba(59, 130, 246, 0.1)",
    border: "rgba(59, 130, 246, 0.2)",
    text: "#2563eb",
  },
  purple: {
    bg: "rgba(168, 85, 247, 0.1)",
    border: "rgba(168, 85, 247, 0.2)",
    text: "#9333ea",
  },
  pink: {
    bg: "rgba(236, 72, 153, 0.1)",
    border: "rgba(236, 72, 153, 0.2)",
    text: "#db2777",
  },
  red: {
    bg: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.2)",
    text: "#dc2626",
  },
  orange: {
    bg: "rgba(249, 115, 22, 0.1)",
    border: "rgba(249, 115, 22, 0.2)",
    text: "#ea580c",
  },
  green: {
    bg: "rgba(34, 197, 94, 0.1)",
    border: "rgba(34, 197, 94, 0.2)",
    text: "#16a34a",
  },
  emerald: {
    bg: "rgba(16, 185, 129, 0.1)",
    border: "rgba(16, 185, 129, 0.2)",
    text: "#059669",
  },
  indigo: {
    bg: "rgba(99, 102, 241, 0.1)",
    border: "rgba(99, 102, 241, 0.2)",
    text: "#4f46e5",
  },
  violet: {
    bg: "rgba(139, 92, 246, 0.1)",
    border: "rgba(139, 92, 246, 0.2)",
    text: "#7c3aed",
  },
};

export default function HeroTag({
  config,
  theme = { primary: "primary" },
  animate = true,
}: HeroTagProps) {
  const { text, icon: Icon, className } = config;
  const colors = colorMap[theme.primary || "primary"] || colorMap.teal;

  const content = (
    <Badge
      className={className || "px-4 py-2 backdrop-blur-sm pointer-events-none"}
      style={
        !className
          ? {
              backgroundColor: colors.bg,
              borderColor: colors.border,
              color: colors.text,
            }
          : undefined
      }
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {text}
    </Badge>
  );

  if (!animate) return <div className="mb-2">{content}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-2"
    >
      {content}
    </motion.div>
  );
}
