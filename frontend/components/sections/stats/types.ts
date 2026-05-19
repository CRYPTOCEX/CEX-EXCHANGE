import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { BaseSectionProps, SectionHeaderConfig, SectionSize } from "../shared/types";

// ============================================================================
// STAT ITEM TYPES
// ============================================================================

export interface StatItemConfig {
  id?: string;
  value: number | string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  iconElement?: ReactNode;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  animate?: boolean;
  trend?: {
    value: number;
    direction: "up" | "down";
    label?: string;
  };
  highlighted?: boolean;
}

// ============================================================================
// LAYOUT TYPES
// ============================================================================

export type StatsLayout =
  | "grid"
  | "grid-compact"
  | "cards"
  | "inline"
  | "minimal"
  | "featured"
  | "banner";

export type StatsColumns = 2 | 3 | 4 | 5 | 6;

export interface StatsLayoutConfig {
  variant: StatsLayout;
  columns?: StatsColumns;
  gap?: SectionSize;
  cardStyle?: "default" | "bordered" | "glass" | "gradient" | "minimal";
  iconStyle?: "default" | "gradient" | "filled" | "outlined";
  showIcon?: boolean;
  showDescription?: boolean;
  showTrend?: boolean;
  size?: SectionSize;
  animateNumbers?: boolean;
}

// ============================================================================
// STATS SECTION PROPS
// ============================================================================

export interface StatsSectionProps extends BaseSectionProps {
  header?: SectionHeaderConfig;
  stats: StatItemConfig[];
  layout?: StatsLayoutConfig;
}

// ============================================================================
// PRESETS
// ============================================================================

export type StatsPreset =
  | "default"
  | "minimal"
  | "cards"
  | "featured"
  | "compact"
  | "banner";

export interface StatsPresetConfig {
  layout: StatsLayoutConfig;
}

export const statsPresets: Record<StatsPreset, StatsPresetConfig> = {
  default: {
    layout: {
      variant: "grid",
      columns: 4,
      gap: "lg",
      cardStyle: "default",
      iconStyle: "gradient",
      showIcon: true,
      showDescription: true,
      showTrend: false,
      size: "md",
    },
  },
  minimal: {
    layout: {
      variant: "minimal",
      columns: 4,
      gap: "md",
      cardStyle: "minimal",
      showIcon: false,
      showDescription: false,
      showTrend: false,
      size: "sm",
    },
  },
  cards: {
    layout: {
      variant: "cards",
      columns: 3,
      gap: "lg",
      cardStyle: "glass",
      iconStyle: "filled",
      showIcon: true,
      showDescription: true,
      showTrend: true,
      size: "lg",
    },
  },
  featured: {
    layout: {
      variant: "featured",
      columns: 3,
      gap: "lg",
      cardStyle: "gradient",
      iconStyle: "gradient",
      showIcon: true,
      showDescription: true,
      showTrend: true,
      size: "xl",
    },
  },
  compact: {
    layout: {
      variant: "grid-compact",
      columns: 5,
      gap: "sm",
      cardStyle: "bordered",
      showIcon: false,
      showDescription: false,
      showTrend: false,
      size: "sm",
    },
  },
  banner: {
    layout: {
      variant: "banner",
      columns: 4,
      gap: "md",
      cardStyle: "minimal",
      showIcon: true,
      showDescription: false,
      showTrend: false,
      size: "md",
    },
  },
};
