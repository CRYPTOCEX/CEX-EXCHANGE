"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { m, useScroll, useTransform, useSpring, useInView, useReducedMotion, MotionValue } from "framer-motion";

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

/**
 * Friendly pattern-colour names -> a CSS colour built from a CORE TOKEN.
 *
 * This map used to hold raw Tailwind hexes (`teal: "14b8a6"`, `indigo:
 * "6366f1"`, ...) baked straight into the pattern's data-URI as `%23000`.
 * That made every landing pattern in the app -- 39 consumers -- paint a fixed
 * teal/indigo that no theme could move. It was the last signature left in the
 * full-palette-swap readiness test.
 *
 * `primary: "currentColor"` was doubly broken: a `data:` URI SVG is a SEPARATE
 * DOCUMENT, so `currentColor` never inherits from the host page -- and here it
 * was interpolated into `%23000`, producing the invalid `#currentColor`,
 * which painted nothing at all.
 *
 * HOW THIS WORKS NOW: the pattern SVG is used as a MASK, not as a picture, and
 * the colour comes from an ordinary `backgroundColor` on the host element. So
 * the SVG's own fill is irrelevant (a mask only reads alpha) and the colour is
 * a plain CSS custom property that follows the theme with no JS, no
 * `getComputedStyle`, and no SSR/hydration mismatch.
 *
 * The first attempt here DID resolve tokens in JS and bake a hex into the URI.
 * It needed a MutationObserver to survive a theme toggle, produced a fallback
 * colour on the server render, and I put its `useMemo`s below an early return
 * (a hooks violation). Masking removes that entire class of problem.
 *
 * Names are preserved so none of the 39 call sites change.
 */
const colorMap: Record<string, string> = {
  primary: "hsl(var(--primary))",
  blue: "hsl(var(--primary))",
  indigo: "hsl(var(--primary))",
  cyan: "hsl(var(--info))",
  emerald: "hsl(var(--success))",
  teal: "hsl(var(--chart-3))",
  purple: "hsl(var(--chart-4))",
  pink: "hsl(var(--chart-5))",
  zinc: "hsl(var(--muted-foreground))",
  white: "hsl(var(--overlay-foreground))",
  black: "hsl(var(--shadow))",
};

/** Resolve a friendly name to a CSS colour; anything unknown is passed through
 *  so a caller can still hand in a literal. */
function patternColor(name: string | undefined, fallbackName: string): string {
  const key = name || fallbackName;
  return colorMap[key] || key;
}

// SVG patterns for different variants
const getPattern = (variant: string, size: number) => {
  const patterns: Record<string, string> = {
    grid: `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M ${size} 0 L 0 0 0 ${size}' fill='none' stroke='%23000' stroke-width='0.5'/%3E%3C/svg%3E")`,

    dots: `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='${size / 2}' cy='${size / 2}' r='1.5' fill='%23000'/%3E%3C/svg%3E")`,

    crosses: `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000'%3E%3Cpath d='M${size / 2 - 1} ${size / 2 - 4}h2v8h-2zM${size / 2 - 4} ${size / 2 - 1}h8v2h-8z'/%3E%3C/g%3E%3C/svg%3E")`,

    lines: `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='${size}' x2='${size}' y2='0' stroke='%23000' stroke-width='0.5'/%3E%3C/svg%3E")`,

    hexagons: `url("data:image/svg+xml,%3Csvg width='${size * 1.5}' height='${size * 1.732}' viewBox='0 0 28 49.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49.5v-8l12.99-7.5H28v2.31h-.01L17 43.15v6.35h-2z' fill='%23000' fill-opacity='0.4'/%3E%3C/svg%3E")`,

    diamonds: `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M${size / 2} 0L${size} ${size / 2}L${size / 2} ${size}L0 ${size / 2}Z' fill='none' stroke='%23000' stroke-width='0.5'/%3E%3C/svg%3E")`,
  };

  return patterns[variant] || patterns.grid;
};

export default function InteractivePattern({
  config,
  theme = { primary: "teal", secondary: "cyan" },
  className = "",
}: InteractivePatternProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const isInView = useInView(containerRef, { margin: "-50px" });
  const prefersReducedMotion = useReducedMotion();

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

  // Pause animations when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Only animate when visible, page is active, and user doesn't prefer reduced motion
  const shouldAnimate = interactive && isInView && isPageVisible && !prefersReducedMotion;

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


  // Plain CSS colours -- no JS resolution, so these are correct during SSR and
  // follow a theme change for free.
  const resolvedColor = color
    ? patternColor(color, "primary")
    : patternColor(theme.primary, "teal");
  const secondaryColor = patternColor(theme.secondary, "cyan");

  const pattern = getPattern(variant, size);
  const secondaryPattern = getPattern(variant, size * 1.5);

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {/* Primary pattern layer */}
      <m.div
        className="absolute inset-0"
        style={{
          // The SVG is a MASK, so its own fill never reaches the screen; the
          // colour below is what paints, and it is a token.
          maskImage: pattern,
          WebkitMaskImage: pattern,
          backgroundColor: resolvedColor,
          opacity: opacity,
          y: shouldAnimate ? smoothY : 0,
          x: shouldAnimate ? smoothX : 0,
        }}
        initial={animate ? { opacity: 0 } : undefined}
        animate={animate ? { opacity: opacity } : undefined}
        transition={animate ? { duration: 1 } : undefined}
      />

      {/* Secondary pattern layer (larger, offset, creates depth) */}
      <m.div
        className="absolute -inset-20"
        style={{
          maskImage: secondaryPattern,
          WebkitMaskImage: secondaryPattern,
          backgroundColor: secondaryColor,
          opacity: opacity * 0.5,
          y: shouldAnimate ? smoothY2 : 0,
        }}
      />

      {/* Animated gradient overlay for premium feel - only animate when visible */}
      {animate && shouldAnimate && (
        <m.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, transparent 0%, transparent 70%, hsl(var(--shadow) / 0.02) 100%)`,
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
    <m.div
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
      {/*
        Decorative shapes take the accent token rather than `shape.color`, which
        is now unpainted and survives only as an input to the position seed.
        These were the last painted off-token colours on /blog: a cyan and a
        zinc 1px border on the loading-state shapes.
      */}
      {shape.type === "circle" && (
        <div
          className="w-full h-full rounded-full"
          style={{
            background: `linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))`,
            border: `1px solid hsl(var(--primary) / 0.12)`,
          }}
        />
      )}
      {shape.type === "square" && (
        <div
          className="w-full h-full rounded-lg"
          style={{
            background: `linear-gradient(135deg, hsl(var(--primary) / 0.06), transparent)`,
            border: `1px solid hsl(var(--primary) / 0.08)`,
          }}
        />
      )}
      {shape.type === "triangle" && (
        <div
          className="w-full h-full"
          style={{
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
            background: `linear-gradient(180deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))`,
          }}
        />
      )}
    </m.div>
  );
}

// Floating geometric shapes that move with scroll
export function FloatingShapes({
  theme = { primary: "teal", secondary: "cyan" },
  count = 3,
  interactive = true,
}: {
  theme?: { primary?: string; secondary?: string };
  count?: number;
  interactive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const isInView = useInView(containerRef, { margin: "-50px" });
  const prefersReducedMotion = useReducedMotion();

  // Only render shapes on client to avoid hydration mismatch
  // (framer-motion's useSpring/useTransform produce different initial values on server vs client)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Pause animations when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Only animate when visible, page is active, and user doesn't prefer reduced motion
  const shouldAnimate = interactive && isInView && isPageVisible && !prefersReducedMotion;

  /* Was `colorMap[...] || "14b8a6"` / `"06b6d4"` — raw Tailwind hexes with no
     `#`, so they were never valid colours anyway, and no palette check could
     see them (not a class, not a `#hex`). `patternColor` is this file's own
     resolver and is already used by the component above. */
  const primaryColor = patternColor(theme.primary, "teal");
  const secondaryColor = patternColor(theme.secondary, "cyan");

  // Generate shapes with unique positions per section based on theme colors
  const shapes = useMemo(() => {
    // Create a unique seed based on theme colors so each section looks different
    const themeSeed = (primaryColor + secondaryColor).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return Array.from({ length: count }, (_, i) => {
      const seed = (i + 1) * 1234 + themeSeed * (i + 1);
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
          interactive={shouldAnimate}
        />
      ))}
    </div>
  );
}
