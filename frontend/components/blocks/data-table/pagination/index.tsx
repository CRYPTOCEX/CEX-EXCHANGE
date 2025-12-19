"use client";

import React from "react";
import { PaginationSizeSelector } from "./pagination-size-selector";
import { PaginationInfo } from "./pagination-info";
import { PaginationControls } from "./pagination-controls";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Premium staggered entrance animation for pagination container
const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export function TablePagination() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "relative overflow-hidden rounded-xl mt-4",
        // Premium glassmorphism
        "bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30",
        "backdrop-blur-sm",
        // Premium border
        "border border-border/30",
        // Premium shadow
        "shadow-sm shadow-black/5"
      )}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />

      <div
        className={cn(
          "flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 px-4 py-3",
          "sm:ltr:flex-row sm:rtl:flex-row-reverse"
        )}
      >
        {/* Size selector - hidden on very small screens to save space */}
        <motion.div
          variants={itemVariants}
          className="hidden sm:flex items-center space-x-4 lg:space-x-6"
        >
          <PaginationSizeSelector />
        </motion.div>
        {/* Page info and controls - always visible, centered on mobile */}
        <motion.div
          variants={itemVariants}
          className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6"
        >
          <PaginationInfo />
          <PaginationControls />
        </motion.div>
      </div>
    </motion.div>
  );
}
