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

/**
 * Named colours accepted by `config.colors` / `config.primaryColor`.
 *
 * These were 17 hardcoded Tailwind hexes (plus a 3-shade variant of each). The
 * class-based ratchet cannot see hex in a JS map, so this one shared component
 * kept painting off-token decoration across the app long after the class debt
 * hit zero — the purple/emerald blobs on the admin deposit log and the cyan
 * marks on /blog were all coming from here.
 *
 * The names are preserved so no caller changes; each now resolves to the design
 * token that carries the same meaning. `getColor` already accepted
 * `hsl(...)` / `var(--x)`, so nothing downstream needed touching.
 */
const tailwindColors: Record<string, string> = {
  // brand / interaction
  blue: "hsl(var(--primary))",
  indigo: "hsl(var(--primary))",
  // status
  emerald: "hsl(var(--success))",
  green: "hsl(var(--success))",
  teal: "hsl(var(--success))",
  lime: "hsl(var(--success))",
  amber: "hsl(var(--warning))",
  orange: "hsl(var(--warning))",
  yellow: "hsl(var(--warning))",
  red: "hsl(var(--destructive))",
  rose: "hsl(var(--destructive))",
  pink: "hsl(var(--destructive))",
  cyan: "hsl(var(--info))",
  sky: "hsl(var(--info))",
  /* Decoration, not identity — so the accent, not a ramp slot. These pointed at
     `--chart-3`, which is 159deg, i.e. GREEN: the ramp's violet slot is
     `--chart-4`. Ambient particles identify nothing, so under a single-accent
     system they take `--primary` and the violet goes. */
  purple: "hsl(var(--primary))",
  violet: "hsl(var(--primary))",
  fuchsia: "hsl(var(--primary))",
  white: "hsl(var(--foreground))",
};

/**
 * Shade variants. A token is a single value, so the 400/500/600 steps become
 * opacity steps instead — which is what the shades were doing visually on a
 * blurred, animated particle anyway.
 */
const SHADE_ALPHA: Record<string, number> = { 400: 0.7, 500: 1, 600: 0.85 };

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
    return "hsl(var(--primary))";
  }
  // `emerald-400` etc: same token, opacity carries the shade.
  const match = color.match(/^([a-z]+)-(\d+)$/);
  if (match) {
    const [, colorName, shade] = match;
    const base = tailwindColors[colorName];
    if (base) {
      const alpha = SHADE_ALPHA[shade];
      return alpha === undefined || alpha === 1
        ? base
        : base.replace(/^hsl\((var\(--[\w-]+\))\)$/, `hsl($1 / ${alpha})`);
    }
  }
  return tailwindColors[color] || "hsl(var(--primary))";
};

/**
 * Re-emit a colour at a given alpha.
 *
 * Every value `getColor` returns is now a design token — `hsl(var(--success))` —
 * so the particle glow could no longer be built the way it was, by appending a
 * hex alpha byte (`` `${particle.color}50` ``). `hsl(var(--success))50` is not a
 * colour, and an unparseable value makes the browser drop the WHOLE `box-shadow`
 * declaration, so every particle field in the app has been rendering with no
 * glow at all since the tokens landed. It fails silently, which is why it
 * survived the class migration.
 *
 * The alpha has to go inside the colour function instead. Any alpha already
 * present is replaced, not stacked — `SHADE_ALPHA` above can hand us
 * `hsl(var(--x) / 0.7)`, and `hsl(var(--x) / 0.7 / 0.31)` is invalid.
 */
const withAlpha = (color: string, alpha: number): string => {
  const hsl = /^hsla?\((.*)\)$/i.exec(color);
  if (hsl) return `hsl(${hsl[1].split("/")[0].trim()} / ${alpha})`;

  const rgb = /^rgba?\((.*)\)$/i.exec(color);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length >= 3) {
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    }
  }

  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const byte = Math.round(alpha * 255).toString(16).padStart(2, "0");
    return `#${hex[1]}${byte}`;
  }

  return color;
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
              ? `0 0 ${particle.size * 2}px ${particle.size * 0.5}px ${withAlpha(particle.color, 0.31)},
                 0 0 ${particle.size * 4}px ${particle.size}px ${withAlpha(particle.color, 0.19)}`
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
    colors: ["white", "violet", "blue"],
  },
} as const;

export type ParticlePreset = keyof typeof particlePresets;

export default Particles;
