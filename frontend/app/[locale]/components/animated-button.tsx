"use client";

import type React from "react";

import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface AnimatedButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
}

export function AnimatedButton({
  href,
  children,
  variant = "primary",
  className,
}: AnimatedButtonProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const getButtonClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white";
      case "secondary":
        return isDark
          ? "bg-[#1A1F2E] hover:bg-[#252A3A] text-white border border-[#252A3A]"
          : "bg-white hover:bg-gray-100 text-gray-800 border border-gray-200";
      case "outline":
        return isDark
          ? "bg-transparent hover:bg-[#1A1F2E]/50 text-white border border-[#252A3A]"
          : "bg-transparent hover:bg-gray-100/50 text-gray-800 border border-gray-200";
      default:
        return "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white";
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        href={href}
        className={cn(
          "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors",
          getButtonClasses(),
          className
        )}
      >
        {children}
      </Link>
    </motion.div>
  );
}
