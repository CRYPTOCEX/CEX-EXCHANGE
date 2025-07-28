"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  duration: number; // in seconds
  onComplete: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showProgress?: boolean;
}

export function CountdownTimer({
  duration,
  onComplete,
  className,
  size = "md",
  showText = true,
  showProgress = true,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(true);

  // Calculate size based on prop
  const sizeClasses = {
    sm: "w-16 h-16 text-sm",
    md: "w-24 h-24 text-base",
    lg: "w-32 h-32 text-lg",
  };

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  // Calculate progress percentage
  const progress = (timeLeft / duration) * 100;

  // Calculate stroke dash values for SVG circle
  const radius = size === "sm" ? 28 : size === "md" ? 44 : 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  // Determine color based on time left
  const getColor = useCallback(() => {
    if (timeLeft > duration * 0.6) return "text-green-500 stroke-green-500";
    if (timeLeft > duration * 0.3) return "text-yellow-500 stroke-yellow-500";
    return "text-red-500 stroke-red-500";
  }, [timeLeft, duration]);

  // Pulse animation when time is running low
  const shouldPulse = timeLeft < 60; // Last minute

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRunning(false);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onComplete]);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        sizeClasses[size],
        className
      )}
    >
      <AnimatePresence>
        {shouldPulse && (
          <motion.div
            initial={{ opacity: 0.5, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
            className={cn(
              "absolute inset-0 rounded-full",
              getColor().split(" ")[1].replace("stroke-", "bg-"),
              "opacity-20"
            )}
          />
        )}
      </AnimatePresence>

      <svg
        className="w-full h-full"
        viewBox={`0 0 ${radius * 2 + 8} ${radius * 2 + 8}`}
      >
        {showProgress && (
          <>
            {/* Background circle */}
            <circle
              cx={radius + 4}
              cy={radius + 4}
              r={radius}
              fill="none"
              strokeWidth="4"
              className="stroke-gray-200 dark:stroke-gray-700"
            />

            {/* Progress circle */}
            <motion.circle
              cx={radius + 4}
              cy={radius + 4}
              r={radius}
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${radius + 4} ${radius + 4})`}
              className={getColor().split(" ")[1]}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </>
        )}
      </svg>

      {showText && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className={cn("font-mono font-bold", getColor().split(" ")[0])}
            key={timeLeft}
            initial={{ scale: 1.1, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {formatTime(timeLeft)}
          </motion.span>
        </div>
      )}
    </div>
  );
}
