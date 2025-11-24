"use client";

import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { TabButtonProps } from "../../types";

export function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: TabButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-300 relative overflow-hidden ${
        active
          ? "bg-primary/10 text-primary shadow-md"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background animation */}
      {active && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg"
          layoutId="activeTabBackground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      {/* Animated particles on active state */}
      {active && (
        <>
          <motion.div
            className="absolute top-1/2 left-1/4 w-1 h-1 rounded-full bg-primary/40"
            animate={{
              y: [0, -15, 0],
              opacity: [0, 1, 0],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 2,
              repeatType: "loop",
            }}
          />
          <motion.div
            className="absolute top-1/3 right-1/4 w-1 h-1 rounded-full bg-primary/40"
            animate={{
              y: [0, -20, 0],
              opacity: [0, 1, 0],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 2.5,
              repeatType: "loop",
              delay: 0.5,
            }}
          />
          <motion.div
            className="absolute bottom-1/3 right-1/3 w-1 h-1 rounded-full bg-primary/40"
            animate={{
              y: [0, -12, 0],
              opacity: [0, 1, 0],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 1.8,
              repeatType: "loop",
              delay: 1,
            }}
          />
        </>
      )}

      {/* Icon with 3D effect */}
      <motion.div
        className={`p-2 rounded-full relative z-10 shadow-sm transform-gpu preserve-3d ${active ? "bg-primary/20" : "bg-muted"}`}
        whileHover={{
          rotateY: 15,
          rotateX: -15,
          scale: 1.1,
          transition: { duration: 0.2 },
        }}
      >
        <Icon className="h-5 w-5" />
      </motion.div>

      <span className="font-medium relative z-10">{label}</span>

      {badge !== undefined && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          <Badge className="ml-auto bg-gradient-to-r from-primary to-primary/80 shadow-sm relative z-10">
            {badge}
          </Badge>
        </motion.div>
      )}

      {/* Active indicator */}
      {active && (
        <motion.div
          layoutId="activeTabIndicator"
          className="ml-auto w-1.5 h-5 bg-gradient-to-b from-primary to-primary/70 rounded-full shadow-glow-sm relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
    </motion.button>
  );
}
