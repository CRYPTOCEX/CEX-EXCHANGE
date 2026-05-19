// Main component
export { default as HeroSection, heroPresets } from "./HeroSection";

// Background components
export { GradientOrbs, GridPattern, HeroBackground } from "./backgrounds";

// Content components
export { HeroTag, HeroHeading, HeroSubtitle } from "./content";

// Action components
export { HeroActions } from "./actions";

// Stats components
export { AnimatedCounter, HeroStats } from "./stats";

// Scroll indicator
export { default as ScrollIndicator } from "./ScrollIndicator";

// Types
export type {
  // Background types
  BackgroundVariant,
  ParticleStyle,
  GradientOrbConfig,
  ParticlesConfig,
  GridPatternConfig,
  BackgroundConfig,
  // Content types
  ContentAlignment,
  ContentPosition,
  TagConfig,
  HeadingConfig,
  SubtitleConfig,
  // Action types
  ButtonVariant,
  ButtonSize,
  ActionButtonConfig,
  // Stat types
  StatConfig,
  StatsConfig,
  // Scroll indicator types
  ScrollIndicatorStyle,
  ScrollIndicatorConfig,
  // Main types
  HeroContentConfig,
  HeroLayoutConfig,
  HeroSectionProps,
  // Preset types
  HeroPreset,
  HeroPresetConfig,
} from "./types";

// Re-export AnimationConfig from shared (avoiding naming conflict)
export type { AnimationConfig as HeroAnimationConfig } from "../shared/types";
