import { ReactNode, ComponentType } from "react";
import { LucideIcon } from "lucide-react";
import { AnimationConfig } from "../shared/types";

// ============================================================================
// BACKGROUND TYPES
// ============================================================================

export type BackgroundVariant =
  | "gradient"
  | "solid"
  | "image"
  | "video"
  | "none";

export type ParticleStyle = "circles" | "dots" | "stars" | "custom";

export interface GradientOrbConfig {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  size: "sm" | "md" | "lg" | "xl";
  color: string;
  blur: number;
  opacity: number;
  animate?: boolean;
  animationDelay?: number;
}

export interface ParticlesConfig {
  enabled: boolean;
  count?: number;
  style?: ParticleStyle;
  color?: string;
  minSize?: number;
  maxSize?: number;
  minDuration?: number;
  maxDuration?: number;
  direction?: "up" | "down" | "left" | "right" | "random";
}

export interface GridPatternConfig {
  enabled: boolean;
  opacity?: number;
  size?: number;
  color?: string;
}

export interface BackgroundConfig {
  variant?: BackgroundVariant;
  // Gradient background
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;
  gradientDirection?: "to-r" | "to-l" | "to-t" | "to-b" | "to-br" | "to-bl" | "to-tr" | "to-tl";
  // Solid background
  solidColor?: string;
  // Image background
  imageUrl?: string;
  imageOverlay?: boolean;
  imageOverlayOpacity?: number;
  // Video background
  videoUrl?: string;
  videoPoster?: string;
  // Effects
  orbs?: GradientOrbConfig[];
  particles?: ParticlesConfig;
  gridPattern?: GridPatternConfig;
  // Bottom fade
  bottomFade?: boolean;
  bottomFadeColor?: string;
}

// ============================================================================
// CONTENT LAYOUT TYPES
// ============================================================================

export type ContentAlignment = "left" | "center" | "right";
export type ContentPosition = "left" | "right" | "full";

export interface TagConfig {
  text: string;
  icon?: LucideIcon;
  className?: string;
}

export interface HeadingConfig {
  text: string;
  highlightedText?: string;
  highlightPosition?: "before" | "after" | "inline";
  highlightGradient?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  additionalText?: string;
}

export interface SubtitleConfig {
  text: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// ============================================================================
// ACTION BUTTON TYPES
// ============================================================================

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

export interface ActionButtonConfig {
  text: string;
  href?: string;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  className?: string;
  gradient?: string;
  external?: boolean;
}

// ============================================================================
// STAT TYPES
// ============================================================================

export interface StatConfig {
  value: number;
  label: string;
  icon?: LucideIcon;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  animate?: boolean;
}

export interface StatsConfig {
  items: StatConfig[];
  layout?: "row" | "column" | "grid";
  style?: "badges" | "cards" | "minimal";
  className?: string;
}

// ============================================================================
// SCROLL INDICATOR TYPES
// ============================================================================

export type ScrollIndicatorStyle = "mouse" | "arrow" | "chevron" | "dot";

export interface ScrollIndicatorConfig {
  enabled?: boolean;
  style?: ScrollIndicatorStyle;
  text?: string;
  className?: string;
}

// Animation types are imported from shared/types

// ============================================================================
// HERO SECTION MAIN TYPES
// ============================================================================

export interface HeroContentConfig {
  tag?: TagConfig;
  heading: HeadingConfig;
  subtitle?: SubtitleConfig;
  actions?: ActionButtonConfig[];
  stats?: StatsConfig;
  customContent?: ReactNode;
  customContentPosition?: "above-heading" | "below-heading" | "below-subtitle" | "below-actions" | "bottom";
}

export interface HeroLayoutConfig {
  contentPosition?: ContentPosition;
  contentAlignment?: ContentAlignment;
  sideContent?: ReactNode;
  sideContentPosition?: "left" | "right";
  verticalPadding?: "sm" | "md" | "lg" | "xl";
  minHeight?: "screen" | "auto" | "half" | "three-quarters";
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "full";
  containerClassName?: string;
}

export interface HeroSectionProps {
  // Content
  content: HeroContentConfig;
  // Layout
  layout?: HeroLayoutConfig;
  // Background
  background?: BackgroundConfig;
  // Scroll indicator
  scrollIndicator?: ScrollIndicatorConfig;
  // Animation
  animation?: AnimationConfig;
  // Theme colors (for dynamic theming)
  theme?: {
    primary?: string;
    secondary?: string;
  };
  // Additional className for the section
  className?: string;
  // Children for fully custom content
  children?: ReactNode;
}

// ============================================================================
// PRESET TYPES
// ============================================================================

export type HeroPreset =
  | "default"
  | "centered"
  | "split-left"
  | "split-right"
  | "minimal"
  | "gradient-heavy"
  | "image-background"
  | "video-background";

export interface HeroPresetConfig {
  layout: HeroLayoutConfig;
  background: BackgroundConfig;
  scrollIndicator: ScrollIndicatorConfig;
  animation: AnimationConfig;
}
