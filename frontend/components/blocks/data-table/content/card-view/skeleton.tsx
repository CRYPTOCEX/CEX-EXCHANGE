"use client";

import React from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CardViewSkeletonProps {
  count?: number;
}

// Premium staggered animation for skeleton cards
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
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

// Shimmer animation
const shimmerVariants = {
  initial: { x: "-100%" },
  animate: {
    x: "100%",
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: "linear" as const,
    },
  },
};

export function CardViewSkeleton({ count = 6 }: CardViewSkeletonProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      {Array.from({ length: count }).map((_, index) => (
        <motion.div key={index} variants={cardVariants}>
          <div
            className={cn(
              "relative overflow-hidden rounded-xl",
              "bg-gradient-to-br from-card/95 via-card to-card/90",
              "backdrop-blur-xl",
              "border border-border/50",
              "shadow-lg shadow-black/5 dark:shadow-black/20"
            )}
          >
            {/* Premium gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-secondary/[0.02] pointer-events-none" />

            {/* Animated shimmer overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
            />

            {/* Card Header */}
            <div className="relative p-4 pb-3">
              <div className="flex items-start gap-3">
                {/* Checkbox skeleton */}
                <Skeleton className="h-4 w-4 rounded bg-muted/50" />
                {/* Primary content skeleton (like compound cell) */}
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="h-11 w-11 rounded-full bg-muted/50" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4 bg-muted/50" />
                    <Skeleton className="h-3 w-1/2 bg-muted/40" />
                  </div>
                </div>
                {/* Actions skeleton */}
                <Skeleton className="h-8 w-8 rounded-lg bg-muted/50" />
              </div>
            </div>

            {/* Card Content */}
            <div className="relative px-4 pb-4 space-y-3">
              {/* Display columns grid skeleton with premium styling */}
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-2.5 rounded-lg",
                      "bg-muted/20 dark:bg-muted/10",
                      "border border-border/20"
                    )}
                  >
                    <Skeleton className="h-2.5 w-12 mb-1.5 bg-muted/40" />
                    <Skeleton className="h-4 w-full bg-muted/50" />
                  </div>
                ))}
              </div>

              {/* Show more button skeleton */}
              <Skeleton
                className={cn(
                  "h-9 w-full rounded-lg",
                  "bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30"
                )}
              />
            </div>

            {/* Top accent line skeleton */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-muted/30 to-transparent" />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
