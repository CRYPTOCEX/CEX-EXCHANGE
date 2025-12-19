"use client";

import { useEffect, useState } from "react";
import { GradientOrbConfig } from "../types";
import { cn } from "@/lib/utils";

interface GradientOrbsProps {
  orbs?: GradientOrbConfig[];
}

// Responsive position classes - adjust for mobile portrait orientation
// On mobile: spread vertically (top/bottom), on desktop: spread horizontally (left/right)
const positionClasses: Record<GradientOrbConfig["position"], string> = {
  "top-left": "top-[10%] left-1/2 -translate-x-1/2 md:top-[10%] md:left-[5%] md:translate-x-0",
  "top-right": "top-[25%] left-1/2 -translate-x-1/2 md:top-[10%] md:left-auto md:right-[5%] md:translate-x-0",
  "bottom-left": "bottom-[25%] left-1/2 -translate-x-1/2 md:bottom-[15%] md:left-[5%] md:translate-x-0",
  "bottom-right": "bottom-[10%] left-1/2 -translate-x-1/2 md:bottom-[15%] md:left-auto md:right-[5%] md:translate-x-0",
  center: "top-[45%] left-1/2 -translate-x-1/2 md:top-1/2 md:-translate-y-1/2",
};

// Responsive sizes - smaller on mobile
const sizeClasses: Record<GradientOrbConfig["size"], string> = {
  sm: "w-[200px] h-[200px] md:w-[300px] md:h-[300px]",
  md: "w-[280px] h-[280px] md:w-[450px] md:h-[450px]",
  lg: "w-[350px] h-[350px] md:w-[600px] md:h-[600px]",
  xl: "w-[450px] h-[450px] md:w-[800px] md:h-[800px]",
};

// Color map for common theme colors
const colorMap: Record<string, string> = {
  primary: "var(--primary)",
  secondary: "var(--secondary)",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  emerald: "#10b981",
  indigo: "#6366f1",
  violet: "#8b5cf6",
};

export default function GradientOrbs({ orbs }: GradientOrbsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!orbs || orbs.length === 0) return null;

  return (
    <>
      {orbs.map((orb, index) => {
        const color = colorMap[orb.color] || orb.color;
        const opacity = orb.opacity / 100;

        return (
          <div
            key={index}
            className={cn(
              "absolute rounded-full pointer-events-none",
              positionClasses[orb.position],
              sizeClasses[orb.size]
            )}
            style={{
              background: `radial-gradient(circle at center, ${color} 0%, ${color}80 25%, ${color}40 50%, ${color}20 70%, transparent 85%)`,
              opacity: mounted ? opacity : 0,
              filter: `blur(${orb.blur}px)`,
              transition: "opacity 1s ease-in-out",
              animation: orb.animate
                ? `orbPulse 8s ease-in-out infinite ${orb.animationDelay || 0}s`
                : "none",
            }}
          />
        );
      })}

      <style jsx>{`
        @keyframes orbPulse {
          0%, 100% {
            transform: scale(1) translateY(0);
          }
          25% {
            transform: scale(1.03) translateY(-8px);
          }
          50% {
            transform: scale(1.06) translateY(-4px);
          }
          75% {
            transform: scale(1.02) translateY(-10px);
          }
        }
      `}</style>
    </>
  );
}
