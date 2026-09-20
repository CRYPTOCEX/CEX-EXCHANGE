"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

type LoadingRoadmapProps = {
  message: string;
};

export default function LoadingRoadmap({ message }: LoadingRoadmapProps) {
  return (
    <div className="flex flex-col justify-center items-center p-12 space-y-4">
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <motion.div
          className="absolute inset-0 h-12 w-12 rounded-full border-t-2 border-primary"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
      <p className="text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}
