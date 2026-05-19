"use client";

import type React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedTextProps {
  children: React.ReactNode;
  type?: "heading" | "paragraph" | "subtitle";
  className?: string;
  delay?: number;
}

export function AnimatedText({
  children,
  type = "paragraph",
  className,
  delay = 0,
}: AnimatedTextProps) {
  const getTextClasses = () => {
    switch (type) {
      case "heading":
        return "font-bold text-2xl md:text-3xl";
      case "subtitle":
        return "text-gray-700 dark:text-gray-300 text-lg";
      case "paragraph":
        return "text-gray-600 dark:text-gray-400";
      default:
        return "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
      className={cn(getTextClasses(), className)}
    >
      {children}
    </motion.div>
  );
}
