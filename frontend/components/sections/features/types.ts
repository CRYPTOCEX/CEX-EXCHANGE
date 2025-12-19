import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import {
  BaseSectionProps,
  SectionHeaderConfig,
  SectionSize,
  AnimationVariant,
} from "../shared/types";

// ============================================================================
// FEATURE ITEM TYPES
// ============================================================================

export interface FeatureItemConfig {
  id?: string;
  icon?: LucideIcon;
  iconElement?: ReactNode;
  image?: string;
  title: string;
  description: string;
  badge?: string;
  highlights?: string[];
  link?: {
    text: string;
    href: string;
    external?: boolean;
  };
  stats?: {
    value: string;
    label: string;
  };
  highlighted?: boolean;
  gradient?: string;
}

// ============================================================================
// LAYOUT TYPES
// ============================================================================

export type FeaturesLayout =
  | "grid"
  | "grid-alternating"
  | "cards"
  | "cards-hover"
  | "bento"
  | "list"
  | "list-detailed"
  | "icon-boxes"
  | "minimal";

export type FeaturesColumns = 2 | 3 | 4 | 5 | 6;

export interface FeaturesLayoutConfig {
  variant?: FeaturesLayout;
  columns?: FeaturesColumns;
  gap?: SectionSize;
  itemSize?: SectionSize;
  showIndex?: boolean;
  iconPosition?: "top" | "left" | "inline";
  iconStyle?: "default" | "outlined" | "filled" | "gradient" | "glow";
  cardStyle?: "default" | "bordered" | "elevated" | "glass" | "gradient-border";
  hoverEffect?: "none" | "lift" | "glow" | "scale" | "border-glow";
}

// ============================================================================
// FEATURES SECTION PROPS
// ============================================================================

export interface FeaturesSectionProps extends BaseSectionProps {
  header?: SectionHeaderConfig;
  features: FeatureItemConfig[];
  layout?: FeaturesLayoutConfig;
  showCTA?: boolean;
  cta?: {
    text: string;
    href: string;
    variant?: "primary" | "secondary" | "outline";
  };
}

// ============================================================================
// PRESETS
// ============================================================================

export type FeaturesPreset =
  | "default"
  | "cards-minimal"
  | "cards-hover"
  | "bento"
  | "icon-grid"
  | "list-detailed"
  | "glass-cards"
  | "gradient-cards";

export interface FeaturesPresetConfig {
  layout: FeaturesLayoutConfig;
}

export const featuresPresets: Record<FeaturesPreset, FeaturesPresetConfig> = {
  default: {
    layout: {
      variant: "grid",
      columns: 3,
      gap: "lg",
      iconPosition: "top",
      iconStyle: "gradient",
      hoverEffect: "lift",
    },
  },
  "cards-minimal": {
    layout: {
      variant: "cards",
      columns: 3,
      gap: "md",
      iconPosition: "inline",
      iconStyle: "default",
      cardStyle: "bordered",
      hoverEffect: "lift",
    },
  },
  "cards-hover": {
    layout: {
      variant: "cards-hover",
      columns: 3,
      gap: "lg",
      iconPosition: "top",
      iconStyle: "filled",
      cardStyle: "elevated",
      hoverEffect: "glow",
    },
  },
  bento: {
    layout: {
      variant: "bento",
      gap: "md",
      iconPosition: "top",
      iconStyle: "gradient",
      cardStyle: "glass",
      hoverEffect: "scale",
    },
  },
  "icon-grid": {
    layout: {
      variant: "icon-boxes",
      columns: 4,
      gap: "md",
      iconPosition: "top",
      iconStyle: "glow",
      hoverEffect: "scale",
    },
  },
  "list-detailed": {
    layout: {
      variant: "list-detailed",
      gap: "lg",
      iconPosition: "left",
      iconStyle: "gradient",
      hoverEffect: "lift",
    },
  },
  "glass-cards": {
    layout: {
      variant: "cards",
      columns: 3,
      gap: "lg",
      iconPosition: "top",
      iconStyle: "gradient",
      cardStyle: "glass",
      hoverEffect: "glow",
    },
  },
  "gradient-cards": {
    layout: {
      variant: "cards",
      columns: 3,
      gap: "lg",
      iconPosition: "top",
      iconStyle: "filled",
      cardStyle: "gradient-border",
      hoverEffect: "border-glow",
    },
  },
};
