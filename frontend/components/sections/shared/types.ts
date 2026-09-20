import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

// ============================================================================
// SHARED SECTION TYPES
// ============================================================================

export type SectionSize = "sm" | "md" | "lg" | "xl";
export type SectionAlignment = "left" | "center" | "right";
export type SectionLayout = "grid" | "carousel" | "list" | "masonry";

// ============================================================================
// BACKGROUND TYPES (Shared across all sections)
// ============================================================================

export type BackgroundVariant = "gradient" | "solid" | "pattern" | "mesh" | "none" | "transparent";

export interface GradientOrbConfig {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  size: SectionSize;
  color: string;
  blur: number;
  opacity: number;
  animate?: boolean;
  animationDelay?: number;
}

export interface ParticlesConfig {
  enabled: boolean;
  count?: number;
  primaryColor?: string;
  secondaryColor?: string;
  size?: { min: number; max: number };
  speed?: number;
  opacity?: { min: number; max: number };
  glow?: boolean;
  rising?: boolean;
}

export interface GridPatternConfig {
  enabled: boolean;
  opacity?: number;
  size?: number;
  color?: string;
  variant?: "lines" | "dots" | "squares";
}

export interface SectionBackgroundConfig {
  variant: BackgroundVariant;
  // Gradient
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;
  gradientDirection?: "to-r" | "to-l" | "to-t" | "to-b" | "to-br" | "to-bl" | "to-tr" | "to-tl";
  // Solid
  solidColor?: string;
  // Effects
  orbs?: GradientOrbConfig[];
  particles?: ParticlesConfig;
  gridPattern?: GridPatternConfig;
  // Overlays
  topFade?: boolean;
  bottomFade?: boolean;
  fadeColor?: string;
}

// ============================================================================
// ANIMATION TYPES
// ============================================================================

export type AnimationVariant =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "scale"
  | "blur"
  | "slide"
  | "none";

export interface AnimationConfig {
  enabled?: boolean;
  variant?: AnimationVariant;
  staggerChildren?: number;
  delayChildren?: number;
  duration?: number;
  once?: boolean;
  threshold?: number;
}

// ============================================================================
// THEME TYPES
// ============================================================================

export interface ThemeConfig {
  primary?: string;
  secondary?: string;
  accent?: string;
}

// Color map for all sections
/**
 * Section theme colours -> design tokens.
 *
 * This map plus `gradientMap` below is the reason every extension landing page
 * had its own identity hue — /staking violet, /ecommerce teal, /ico cyan — all
 * sitting under one azure nav. A section wash or an accent rule identifies
 * nothing, so the decorative names collapse onto the accent; the status names
 * keep their meaning, because a red CTA on a warning section is saying
 * something.
 *
 * The names are all preserved: ~20 call sites pass one of these strings.
 *
 * `primary`/`secondary` used to be `var(--primary)`, i.e. the raw HSL triplet
 * `218 100% 64.9%` rather than a colour. Anywhere that reached a CSS colour
 * slot it was invalid, so those two names have never rendered.
 */
export const colorMap: Record<string, string> = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  teal: "hsl(var(--primary))",
  cyan: "hsl(var(--primary))",
  blue: "hsl(var(--primary))",
  purple: "hsl(var(--primary))",
  pink: "hsl(var(--primary))",
  indigo: "hsl(var(--primary))",
  violet: "hsl(var(--primary))",
  fuchsia: "hsl(var(--primary))",
  sky: "hsl(var(--primary))",
  red: "hsl(var(--destructive))",
  rose: "hsl(var(--destructive))",
  orange: "hsl(var(--warning))",
  yellow: "hsl(var(--warning))",
  amber: "hsl(var(--warning))",
  green: "hsl(var(--success))",
  emerald: "hsl(var(--success))",
  lime: "hsl(var(--success))",
  slate: "hsl(var(--muted-foreground))",
  zinc: "hsl(var(--muted-foreground))",
  neutral: "hsl(var(--muted-foreground))",
  stone: "hsl(var(--muted-foreground))",
  gray: "hsl(var(--muted-foreground))",
};

/**
 * Named gradients, now single-hue.
 *
 * Every one of these was a multi-hue ramp — `sunset` ran orange to pink to
 * violet, `aurora` emerald to violet to pink — which is decoration pretending
 * to be identity (R3). Under one accent a gradient is a MARK, not a rainbow, so
 * each name becomes a light-to-dark sweep of a single token. The names survive
 * because callers pass them by string; what changes is that picking `cosmic`
 * over `ocean` no longer repaints the page a different colour.
 */
const sweep = (token: string) => ({
  from: `hsl(var(--${token}))`,
  via: `hsl(var(--${token}) / 0.8)`,
  to: `hsl(var(--${token}))`,
});

export const gradientMap: Record<string, { from: string; via: string; to: string }> = {
  teal: sweep("primary"),
  cyan: sweep("primary"),
  blue: sweep("primary"),
  purple: sweep("primary"),
  pink: sweep("primary"),
  indigo: sweep("primary"),
  violet: sweep("primary"),
  ocean: sweep("primary"),
  cosmic: sweep("primary"),
  emerald: sweep("success"),
  forest: sweep("success"),
  rose: sweep("destructive"),
  fire: sweep("destructive"),
  amber: sweep("warning"),
  sunset: sweep("warning"),
  aurora: sweep("primary"),
};

// ============================================================================
// COMMON COMPONENT TYPES
// ============================================================================

export interface SectionHeaderConfig {
  tag?: {
    text: string;
    icon?: LucideIcon;
  };
  title: string;
  titleHighlight?: string;
  titleHighlightGradient?: string;
  subtitle?: string;
  alignment?: SectionAlignment;
}

export interface ButtonConfig {
  text: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: SectionSize;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  gradient?: string;
  external?: boolean;
}

// ============================================================================
// SECTION BASE PROPS
// ============================================================================

export interface BaseSectionProps {
  id?: string;
  className?: string;
  background?: SectionBackgroundConfig;
  animation?: AnimationConfig;
  theme?: ThemeConfig;
  children?: ReactNode;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getColor = (color: string): string => {
  if (color.startsWith("#") || color.startsWith("rgb") || color.startsWith("hsl")) {
    return color;
  }
  return colorMap[color] || colorMap.primary;
};

/**
 * A colour at a given opacity, whatever the colour is made of.
 *
 * Every tint in these sections used to be built by concatenating two hex digits
 * onto the colour — `${primaryColor}40`. That only works while the value is a
 * six-digit hex; against a token it produces `hsl(var(--primary))40`, which is
 * not a colour, so the browser drops the whole declaration and the element
 * paints nothing. The failure is silent, which is what makes it dangerous: the
 * same shape shipped in the nav for months (DESIGN-SYSTEM.md Phase 3).
 *
 * @param color any CSS colour — token reference, hex, rgb(), or a bare name
 *              from `colorMap`.
 * @param a     opacity 0–1.
 */
export const withAlpha = (color: string, a: number): string => {
  const resolved = getColor(color);
  const opacity = Math.min(1, Math.max(0, a));
  // hsl(var(--x)) -> hsl(var(--x) / a); an existing alpha is replaced.
  const hsl = /^hsl\(\s*(var\(--[\w-]+\))\s*(?:\/\s*[\d.]+\s*)?\)$/.exec(resolved);
  if (hsl) return `hsl(${hsl[1]} / ${opacity})`;
  // #rrggbb -> #rrggbbaa, keeping the old behaviour for literal hex.
  if (/^#[0-9a-fA-F]{6}$/.test(resolved)) {
    return resolved + Math.round(opacity * 255).toString(16).padStart(2, "0");
  }
  if (/^#[0-9a-fA-F]{3}$/.test(resolved)) {
    const [, r, g, b] = /^#(.)(.)(.)$/.exec(resolved)!;
    return `#${r}${r}${g}${g}${b}${b}` + Math.round(opacity * 255).toString(16).padStart(2, "0");
  }
  return `color-mix(in srgb, ${resolved} ${Math.round(opacity * 100)}%, transparent)`;
};

export const getGradient = (name: string): { from: string; via: string; to: string } => {
  return gradientMap[name] || gradientMap.teal;
};

// Utility classes
export const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

export const paddingClasses = {
  sm: "py-12",
  md: "py-16",
  lg: "py-24",
  xl: "py-32",
};

export const gapClasses = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
  xl: "gap-12",
};
