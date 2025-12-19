"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ScrollIndicatorConfig } from "./types";

interface ScrollIndicatorProps {
  config?: ScrollIndicatorConfig;
}

export default function ScrollIndicator({ config }: ScrollIndicatorProps) {
  if (!config?.enabled) return null;

  const { style = "mouse", text, className } = config;

  const renderMouse = () => (
    <motion.div
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="w-6 h-10 rounded-full border-2 border-zinc-300 dark:border-zinc-700 flex items-start justify-center p-2"
    >
      <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" />
    </motion.div>
  );

  const renderArrow = () => (
    <motion.div
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="flex flex-col items-center gap-1"
    >
      <div className="w-0.5 h-8 bg-zinc-300 dark:bg-zinc-700" />
      <ChevronDown className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
    </motion.div>
  );

  const renderChevron = () => (
    <motion.div
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="flex flex-col items-center"
    >
      <ChevronDown className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
      <ChevronDown className="w-6 h-6 -mt-3 text-zinc-300 dark:text-zinc-700" />
    </motion.div>
  );

  const renderDot = () => (
    <motion.div
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="w-3 h-3 rounded-full bg-primary/50"
    />
  );

  const renderIndicator = () => {
    switch (style) {
      case "mouse":
        return renderMouse();
      case "arrow":
        return renderArrow();
      case "chevron":
        return renderChevron();
      case "dot":
        return renderDot();
      default:
        return renderMouse();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5 }}
      className={
        className || "hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 z-10"
      }
    >
      {renderIndicator()}
      {text && (
        <span className="text-xs text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">
          {text}
        </span>
      )}
    </motion.div>
  );
}
