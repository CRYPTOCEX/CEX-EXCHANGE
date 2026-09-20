"use client";

import { withAlpha } from "../../shared/types";
import { useEffect, useState } from "react";
import { GradientOrbConfig } from "../types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

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

/**
 * Orb colour names -> design tokens.
 *
 * This one component is why every extension landing page had its own hue: it
 * held a 12-hue map, and each page picked one. The names stay so no caller
 * changes; an ambient wash identifies nothing, so under a single-accent system
 * they all resolve to the accent. Status names keep their status token, because
 * a red wash on an error page is saying something.
 *
 * `primary` and `secondary` were `var(--primary)` — the raw HSL triplet
 * (`218 100% 64.9%`), not a colour. Dropped into `radial-gradient(...)` that is
 * an invalid stop, which invalidates the whole declaration, so an orb
 * configured as `primary` has never rendered at all.
 */
const TOKEN_BY_NAME: Record<string, string> = {
  primary: "primary",
  secondary: "secondary",
  teal: "primary",
  cyan: "primary",
  blue: "primary",
  purple: "primary",
  pink: "primary",
  indigo: "primary",
  violet: "primary",
  red: "destructive",
  orange: "warning",
  yellow: "warning",
  green: "success",
  emerald: "success",
};

/**
 * The stops were built by concatenating hex alpha onto the colour
 * (`${color}80`), which only works if the colour is a six-digit hex — it
 * produced garbage for the two `var(--…)` entries above. `hsl(var(--x) / a)`
 * carries the alpha properly and works for every value.
 */
const orbGradient = (token: string) =>
  `radial-gradient(circle at center, hsl(var(--${token})) 0%, ` +
  `hsl(var(--${token}) / 0.5) 25%, hsl(var(--${token}) / 0.25) 50%, ` +
  `hsl(var(--${token}) / 0.12) 70%, transparent 85%)`;

export default function GradientOrbs({ orbs }: GradientOrbsProps) {
  const t = useTranslations("components");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!orbs || orbs.length === 0) return null;

  return (
    <>
      {orbs.map((orb, index) => {
        const token = TOKEN_BY_NAME[orb.color] || "primary";
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
              background: orbGradient(token),
              opacity: mounted ? opacity : 0,
              filter: `blur(${orb.blur}px)`,
              /* An inline duration bypasses `--motion-scale`, so this mount
                 fade ignored both a site owner's speed setting and
                 `prefers-reduced-motion` (which works by collapsing the
                 scale). `duration-*` utilities already scale; an inline style
                 has to do it by hand. */
              transition:
                "opacity calc(1s * var(--motion-scale, 1)) var(--motion-ease, cubic-bezier(0.4, 0, 0.2, 1))",
              animation: orb.animate
                ? `orbPulse 8s ease-in-out infinite ${orb.animationDelay || 0}s`
                : "none",
            }}
          />
        );
      })}

      <style jsx>{"@keyframes orbPulse { 0%, 100% { transform: scale(1) translateY(0); } 25% { transform: scale(1.03) translateY(-8px); } 50% { transform: scale(1.06) translateY(-4px); } 75% { transform: scale(1.02) translateY(-10px); } }"}</style>
    </>
  );
}
