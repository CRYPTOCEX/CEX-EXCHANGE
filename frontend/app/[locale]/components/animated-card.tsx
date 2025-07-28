"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useAnimationInView } from "@/hooks/use-animations";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  index?: number;
}

export function AnimatedCard({
  children,
  className = "",
  delay = 0,
  index = 0,
}: AnimatedCardProps) {
  const { ref, isInView } = useAnimationInView();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{
        duration: 0.5,
        delay: delay + index * 0.1,
        ease: [0.25, 0.1, 0.25, 1.0],
      }}
      whileHover={{
        y: -10,
        boxShadow:
          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        transition: { duration: 0.2 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
