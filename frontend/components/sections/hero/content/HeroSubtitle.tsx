"use client";

import { motion } from "framer-motion";
import { SubtitleConfig } from "../types";

interface HeroSubtitleProps {
  config: SubtitleConfig;
  animate?: boolean;
}

const sizeClasses = {
  sm: "text-lg md:text-xl",
  md: "text-xl md:text-2xl",
  lg: "text-2xl md:text-3xl",
};

export default function HeroSubtitle({
  config,
  animate = true,
}: HeroSubtitleProps) {
  const { text, size = "md", className } = config;

  const content = (
    <p
      className={
        className ||
        `${sizeClasses[size]} text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl leading-relaxed`
      }
    >
      {text}
    </p>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {content}
    </motion.div>
  );
}
