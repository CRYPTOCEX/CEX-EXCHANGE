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
export const colorMap: Record<string, string> = {
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
  rose: "#f43f5e",
  fuchsia: "#d946ef",
  lime: "#84cc16",
  sky: "#0ea5e9",
  amber: "#f59e0b",
  slate: "#64748b",
  zinc: "#71717a",
  neutral: "#737373",
  stone: "#78716c",
  gray: "#6b7280",
};

export const gradientMap: Record<string, { from: string; via: string; to: string }> = {
  teal: { from: "#0d9488", via: "#06b6d4", to: "#0d9488" },
  cyan: { from: "#0891b2", via: "#22d3ee", to: "#0891b2" },
  blue: { from: "#2563eb", via: "#3b82f6", to: "#2563eb" },
  purple: { from: "#7c3aed", via: "#a855f7", to: "#7c3aed" },
  pink: { from: "#db2777", via: "#ec4899", to: "#db2777" },
  indigo: { from: "#4f46e5", via: "#6366f1", to: "#4f46e5" },
  violet: { from: "#7c3aed", via: "#8b5cf6", to: "#7c3aed" },
  emerald: { from: "#059669", via: "#10b981", to: "#059669" },
  rose: { from: "#e11d48", via: "#f43f5e", to: "#e11d48" },
  amber: { from: "#d97706", via: "#f59e0b", to: "#d97706" },
  sunset: { from: "#f97316", via: "#ec4899", to: "#8b5cf6" },
  ocean: { from: "#0891b2", via: "#3b82f6", to: "#6366f1" },
  forest: { from: "#059669", via: "#10b981", to: "#14b8a6" },
  fire: { from: "#dc2626", via: "#f97316", to: "#eab308" },
  aurora: { from: "#10b981", via: "#8b5cf6", to: "#ec4899" },
  cosmic: { from: "#6366f1", via: "#8b5cf6", to: "#d946ef" },
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
  return colorMap[color] || colorMap.teal;
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
