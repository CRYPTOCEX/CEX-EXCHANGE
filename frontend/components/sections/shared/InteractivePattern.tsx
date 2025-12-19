"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring, MotionValue } from "framer-motion";

export interface PatternConfig {
  enabled?: boolean;
  variant?: "grid" | "dots" | "crosses" | "lines" | "hexagons" | "diamonds";
  opacity?: number;
  size?: number;
  color?: string;
  interactive?: boolean;
  parallaxStrength?: number; // 0-100, how much the pattern moves with scroll
  animate?: boolean;
}

interface InteractivePatternProps {
  config?: PatternConfig;
  theme?: {
    primary?: string;
    secondary?: string;
  };
  className?: string;
}

// Color map for pattern colors
const colorMap: Record<string, string> = {
  primary: "currentColor",
  teal: "14b8a6",
  cyan: "06b6d4",
  blue: "3b82f6",
  purple: "a855f7",
  pink: "ec4899",
  emerald: "10b981",
  indigo: "6366f1",
  white: "ffffff",
  black: "000000",
  zinc: "71717a",
};

// SVG patterns for different variants
const getPattern = (variant: string, size: number, color: string) => {
  const patterns: Record<string, string> = {
    grid: `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M ${size} 0 L 0 0 0 ${size}' fill='none' stroke='%23${color}' stroke-width='0.5'/%3E%3C/svg%3E")`,

    dots: `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='${size / 2}' cy='${size / 2}' r='1.5' fill='%23${color}'/%3E%3C/svg%3E")`,

    crosses: `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23${color}'%3E%3Cpath d='M${size / 2 - 1} ${size / 2 - 4}h2v8h-2zM${size / 2 - 4} ${size / 2 - 1}h8v2h-8z'/%3E%3C/g%3E%3C/svg%3E")`,

    lines: `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='${size}' x2='${size}' y2='0' stroke='%23${color}' stroke-width='0.5'/%3E%3C/svg%3E")`,

    hexagons: `url("data:image/svg+xml,%3Csvg width='${size * 1.5}' height='${size * 1.732}' viewBox='0 0 28 49.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49.5v-8l12.99-7.5H28v2.31h-.01L17 43.15v6.35h-2z' fill='%23${color}' fill-opacity='0.4'/%3E%3C/svg%3E")`,

    diamonds: `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M${size / 2} 0L${size} ${size / 2}L${size / 2} ${size}L0 ${size / 2}Z' fill='none' stroke='%23${color}' stroke-width='0.5'/%3E%3C/svg%3E")`,
  };

  return patterns[variant] || patterns.grid;
};

export default function InteractivePattern({
  config,
  theme = { primary: "teal", secondary: "cyan" },
  className = "",
}: InteractivePatternProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    enabled = true,
    variant = "grid",
    opacity = 0.03,
    size = 60,
    color,
    interactive = true,
    parallaxStrength = 30,
    animate = false,
  } = config || {};

  // Get scroll progress for this section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Create parallax transforms
  const parallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    [parallaxStrength * -1, parallaxStrength]
  );

  const parallaxX = useTransform(
    scrollYProgress,
    [0, 1],
    [parallaxStrength * -0.5, parallaxStrength * 0.5]
  );

  // Smooth the values
  const smoothY = useSpring(parallaxY, { stiffness: 100, damping: 30 });
  const smoothX = useSpring(parallaxX, { stiffness: 100, damping: 30 });

  // Secondary layer transforms (moves opposite for depth)
  const parallaxY2 = useTransform(
    scrollYProgress,
    [0, 1],
    [parallaxStrength * 0.5, parallaxStrength * -0.5]
  );
  const smoothY2 = useSpring(parallaxY2, { stiffness: 80, damping: 25 });

  if (!enabled) return null;

  // Resolve color
  const resolvedColor = color
    ? colorMap[color] || color
    : colorMap[theme.primary || "teal"] || "14b8a6";

  const pattern = getPattern(variant, size, resolvedColor);

  // Secondary color for layered effect
  const secondaryColor = colorMap[theme.secondary || "cyan"] || "06b6d4";
  const secondaryPattern = getPattern(variant, size * 1.5, secondaryColor);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {/* Primary pattern layer */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: pattern,
          opacity: opacity,
          y: interactive ? smoothY : 0,
          x: interactive ? smoothX : 0,
        }}
        initial={animate ? { opacity: 0 } : undefined}
        animate={animate ? { opacity: opacity } : undefined}
        transition={animate ? { duration: 1 } : undefined}
      />

      {/* Secondary pattern layer (larger, offset, creates depth) */}
      <motion.div
        className="absolute -inset-20"
        style={{
          backgroundImage: secondaryPattern,
          opacity: opacity * 0.5,
          y: interactive ? smoothY2 : 0,
        }}
      />

      {/* Animated gradient overlay for premium feel */}
      {animate && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, transparent 0%, transparent 70%, rgba(0,0,0,0.02) 100%)`,
          }}
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "linear",
          }}
        />
      )}
    </div>
  );
}

// Individual shape component to properly use hooks
interface ShapeData {
  id: number;
  type: string;
  size: number;
  x: number;
  y: number;
  color: string;
  parallaxMultiplier: number;
  rotation: number;
}

function FloatingShape({
  shape,
  scrollYProgress,
  interactive,
}: {
  shape: ShapeData;
  scrollYProgress: MotionValue<number>;
  interactive: boolean;
}) {
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [-50 * shape.parallaxMultiplier, 50 * shape.parallaxMultiplier]
  );
  const rotate = useTransform(
    scrollYProgress,
    [0, 1],
    [shape.rotation, shape.rotation + 45]
  );
  const smoothY = useSpring(y, { stiffness: 50, damping: 20 });
  const smoothRotate = useSpring(rotate, { stiffness: 50, damping: 20 });

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${shape.x}%`,
        top: `${shape.y}%`,
        width: shape.size,
        height: shape.size,
        y: interactive ? smoothY : 0,
        rotate: interactive ? smoothRotate : shape.rotation,
      }}
    >
      {shape.type === "circle" && (
        <div
          className="w-full h-full rounded-full"
          style={{
            background: `linear-gradient(135deg, #${shape.color}15, #${shape.color}05)`,
            border: `1px solid #${shape.color}20`,
          }}
        />
      )}
      {shape.type === "square" && (
        <div
          className="w-full h-full rounded-lg"
          style={{
            background: `linear-gradient(135deg, #${shape.color}10, transparent)`,
            border: `1px solid #${shape.color}15`,
          }}
        />
      )}
      {shape.type === "triangle" && (
        <div
          className="w-full h-full"
          style={{
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
            background: `linear-gradient(180deg, #${shape.color}15, #${shape.color}05)`,
          }}
        />
      )}
    </motion.div>
  );
}

// Floating geometric shapes that move with scroll
export function FloatingShapes({
  theme = { primary: "teal", secondary: "cyan" },
  count = 6,
  interactive = true,
}: {
  theme?: { primary?: string; secondary?: string };
  count?: number;
  interactive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Only render shapes on client to avoid hydration mismatch
  // (framer-motion's useSpring/useTransform produce different initial values on server vs client)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const primaryColor = colorMap[theme.primary || "teal"] || "14b8a6";
  const secondaryColor = colorMap[theme.secondary || "cyan"] || "06b6d4";

  // Generate deterministic shapes
  const shapes = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const seed = i * 1234;
      const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
      };

      return {
        id: i,
        type: ["circle", "square", "triangle"][Math.floor(seededRandom(seed) * 3)],
        size: 20 + seededRandom(seed + 1) * 40,
        x: seededRandom(seed + 2) * 100,
        y: seededRandom(seed + 3) * 100,
        color: i % 2 === 0 ? primaryColor : secondaryColor,
        parallaxMultiplier: 0.5 + seededRandom(seed + 4) * 1,
        rotation: seededRandom(seed + 5) * 360,
      };
    });
  }, [count, primaryColor, secondaryColor]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      {isMounted && shapes.map((shape) => (
        <FloatingShape
          key={shape.id}
          shape={shape}
          scrollYProgress={scrollYProgress}
          interactive={interactive}
        />
      ))}
    </div>
  );
}
