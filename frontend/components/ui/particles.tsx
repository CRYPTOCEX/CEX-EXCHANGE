"use client";

import React, { useState, useEffect, useRef, useId } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface ParticleConfig {
  count?: number;
  colors?: string[];
  primaryColor?: string;
  secondaryColor?: string;
  size?: { min: number; max: number } | number;
  speed?: number;
  opacity?: { min: number; max: number };
  glow?: boolean;
  rising?: boolean;
  // Deprecated props kept for compatibility
  preset?: string;
  type?: string;
  interactive?: boolean;
  interactionRadius?: number;
  repelStrength?: number;
  connections?: boolean;
  connectionDistance?: number;
}

interface ParticleProps {
  config?: ParticleConfig;
  className?: string;
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

const tailwindColors: Record<string, string> = {
  emerald: "#10b981",
  cyan: "#06b6d4",
  purple: "#a855f7",
  blue: "#3b82f6",
  pink: "#ec4899",
  amber: "#f59e0b",
  red: "#ef4444",
  green: "#22c55e",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  teal: "#14b8a6",
  orange: "#f97316",
  rose: "#f43f5e",
  fuchsia: "#d946ef",
  lime: "#84cc16",
  sky: "#0ea5e9",
  yellow: "#eab308",
  white: "#ffffff",
};

const tailwindColorShades: Record<string, Record<string, string>> = {
  emerald: { 400: "#34d399", 500: "#10b981", 600: "#059669" },
  cyan: { 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2" },
  purple: { 400: "#c084fc", 500: "#a855f7", 600: "#9333ea" },
  blue: { 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb" },
  pink: { 400: "#f472b6", 500: "#ec4899", 600: "#db2777" },
  amber: { 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706" },
  red: { 400: "#f87171", 500: "#ef4444", 600: "#dc2626" },
  green: { 400: "#4ade80", 500: "#22c55e", 600: "#16a34a" },
  indigo: { 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5" },
  violet: { 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed" },
  teal: { 400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488" },
  orange: { 400: "#fb923c", 500: "#f97316", 600: "#ea580c" },
  rose: { 400: "#fb7185", 500: "#f43f5e", 600: "#e11d48" },
  fuchsia: { 400: "#e879f9", 500: "#d946ef", 600: "#c026d3" },
  lime: { 400: "#a3e635", 500: "#84cc16", 600: "#65a30d" },
  sky: { 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7" },
  yellow: { 400: "#facc15", 500: "#eab308", 600: "#ca8a04" },
};

const getColor = (color: string): string => {
  if (color.startsWith("#") || color.startsWith("rgb") || color.startsWith("hsl")) {
    return color;
  }
  if (color.startsWith("var(")) {
    if (typeof window !== "undefined") {
      const varName = color.match(/var\(([^)]+)\)/)?.[1];
      if (varName) {
        const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        if (computed) {
          if (/^\d/.test(computed) && computed.includes("%")) {
            return `hsl(${computed})`;
          }
          return computed;
        }
      }
    }
    return "#10b981";
  }
  const match = color.match(/^([a-z]+)-(\d+)$/);
  if (match) {
    const [, colorName, shade] = match;
    if (tailwindColorShades[colorName]?.[shade]) {
      return tailwindColorShades[colorName][shade];
    }
  }
  return tailwindColors[color] || "#10b981";
};

// ============================================================================
// MAIN PARTICLES COMPONENT
// ============================================================================

export function Particles({ config = {}, className = "" }: ParticleProps) {
  const [isClient, setIsClient] = useState(false);
  const uniqueId = useId().replace(/:/g, "");
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const configRef = useRef(config);
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    size: number;
    color: string;
    opacity: number;
    duration: number;
    delay: number;
    drift: number;
    layer: number;
  }>>([]);

  configRef.current = config;

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Generate particles and inject CSS keyframes
  useEffect(() => {
    if (!isClient) return;

    const cfg = configRef.current;
    const count = cfg.count ?? 40;
    const primaryColor = cfg.primaryColor ?? "emerald";
    const secondaryColor = cfg.secondaryColor ?? "cyan";
    const speed = cfg.speed ?? 1;
    const rising = cfg.rising ?? true;

    if (!rising) return;

    // Normalize size
    const configSize = cfg.size ?? { min: 3, max: 8 };
    const size = typeof configSize === "number"
      ? { min: Math.max(2, configSize - 2), max: configSize + 2 }
      : configSize;

    // Normalize opacity
    const configOpacity = cfg.opacity ?? { min: 0.4, max: 0.8 };

    // Get colors
    let colors: string[];
    if (cfg.colors && cfg.colors.length > 0) {
      colors = cfg.colors.map(getColor);
    } else {
      colors = [getColor(primaryColor), getColor(secondaryColor)];
    }

    // Generate particles with VERY different speeds
    const newParticles: typeof particles = [];

    // Create shared keyframes for different drift patterns
    let cssKeyframes = "";
    const driftPatterns = 10; // Number of different drift patterns

    for (let d = 0; d < driftPatterns; d++) {
      const driftAmount = (d - driftPatterns / 2) * 4; // -20 to +20 range
      cssKeyframes += `
        @keyframes rise-${uniqueId}-${d} {
          0% {
            transform: translateY(0) translateX(0) scale(0.3);
            opacity: 0;
          }
          5% {
            transform: translateY(-5vh) translateX(${driftAmount * 0.1}px) scale(0.7);
            opacity: var(--particle-opacity);
          }
          10% {
            transform: translateY(-10vh) translateX(${driftAmount * 0.2}px) scale(1);
            opacity: var(--particle-opacity);
          }
          30% {
            transform: translateY(-30vh) translateX(${driftAmount * 0.5}px) scale(1);
            opacity: var(--particle-opacity);
          }
          50% {
            transform: translateY(-50vh) translateX(${driftAmount * 0.8}px) scale(1);
            opacity: var(--particle-opacity);
          }
          70% {
            transform: translateY(-70vh) translateX(${driftAmount}px) scale(1);
            opacity: var(--particle-opacity);
          }
          85% {
            transform: translateY(-85vh) translateX(${driftAmount * 0.7}px) scale(0.8);
            opacity: calc(var(--particle-opacity) * 0.5);
          }
          95% {
            transform: translateY(-95vh) translateX(${driftAmount * 0.3}px) scale(0.5);
            opacity: calc(var(--particle-opacity) * 0.2);
          }
          100% {
            transform: translateY(-110vh) translateX(0) scale(0.3);
            opacity: 0;
          }
        }
      `;
    }

    // Create particles with varied properties
    for (let i = 0; i < count; i++) {
      // Layer affects size and opacity
      const layer = Math.floor(Math.random() * 3); // 0, 1, 2
      const layerScale = [0.5, 0.75, 1][layer];
      const layerOpacity = [0.5, 0.75, 1][layer];

      // VERY varied durations: 8s to 45s - this creates natural desync
      // Fast particles (8-15s), medium (15-25s), slow (25-45s)
      const speedCategory = Math.random();
      let baseDuration: number;
      if (speedCategory < 0.3) {
        baseDuration = 8 + Math.random() * 7; // Fast: 8-15s
      } else if (speedCategory < 0.7) {
        baseDuration = 15 + Math.random() * 10; // Medium: 15-25s
      } else {
        baseDuration = 25 + Math.random() * 20; // Slow: 25-45s
      }
      baseDuration = baseDuration / speed;

      const particleSize = (size.min + Math.random() * (size.max - size.min)) * layerScale;
      const particleOpacity = (configOpacity.min + Math.random() * (configOpacity.max - configOpacity.min)) * layerOpacity;

      // Stagger delays using negative values to start mid-animation
      // This ensures particles are visible immediately across the viewport
      const delay = -(Math.random() * baseDuration);

      // Pick a drift pattern
      const driftPattern = Math.floor(Math.random() * driftPatterns);

      newParticles.push({
        id: i,
        x: 2 + Math.random() * 96, // Full width coverage
        size: particleSize,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: particleOpacity,
        duration: baseDuration,
        delay,
        drift: driftPattern,
        layer,
      });
    }

    setParticles(newParticles);

    // Inject CSS
    if (styleRef.current) {
      styleRef.current.remove();
    }
    const style = document.createElement("style");
    style.textContent = cssKeyframes;
    document.head.appendChild(style);
    styleRef.current = style;

    return () => {
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    };
  }, [isClient, uniqueId]);

  const glow = configRef.current.glow ?? true;
  const rising = configRef.current.rising ?? true;

  if (!isClient || !rising || particles.length === 0) return null;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full will-change-transform"
          style={{
            "--particle-opacity": particle.opacity,
            left: `${particle.x}%`,
            bottom: 0,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            zIndex: particle.layer,
            boxShadow: glow
              ? `0 0 ${particle.size * 2}px ${particle.size * 0.5}px ${particle.color}50,
                 0 0 ${particle.size * 4}px ${particle.size}px ${particle.color}30`
              : undefined,
            filter: particle.layer === 0 ? "blur(0.5px)" : undefined,
            animation: `rise-${uniqueId}-${particle.drift} ${particle.duration}s linear infinite`,
            animationDelay: `${particle.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const particlePresets = {
  rising: {
    count: 40,
    rising: true,
    glow: true,
    size: { min: 3, max: 8 },
    speed: 1,
    opacity: { min: 0.4, max: 0.8 },
  },
  subtle: {
    count: 30,
    rising: true,
    glow: true,
    size: { min: 2, max: 5 },
    speed: 0.8,
    opacity: { min: 0.3, max: 0.6 },
  },
  dense: {
    count: 60,
    rising: true,
    glow: true,
    size: { min: 2, max: 6 },
    speed: 1,
    opacity: { min: 0.4, max: 0.7 },
  },
  cosmic: {
    count: 50,
    rising: true,
    glow: true,
    size: { min: 2, max: 5 },
    speed: 0.7,
    opacity: { min: 0.4, max: 0.9 },
    colors: ["#ffffff", "#a78bfa", "#60a5fa"],
  },
} as const;

export type ParticlePreset = keyof typeof particlePresets;

export default Particles;
