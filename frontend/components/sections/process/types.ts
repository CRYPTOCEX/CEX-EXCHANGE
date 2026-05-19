import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { BaseSectionProps, SectionHeaderConfig, SectionSize } from "../shared/types";

// ============================================================================
// PROCESS STEP TYPES
// ============================================================================

export interface ProcessStepConfig {
  id?: string;
  number?: number;
  title: string;
  description: string;
  icon?: LucideIcon;
  iconElement?: ReactNode;
  image?: string;
  badge?: string;
  features?: string[];
  gradient?: string;
  link?: {
    text: string;
    href: string;
  };
  highlighted?: boolean;
}

// ============================================================================
// LAYOUT TYPES
// ============================================================================

export type ProcessLayout =
  | "horizontal"
  | "vertical"
  | "grid"
  | "timeline"
  | "cards"
  | "minimal"
  | "zigzag";

export interface ProcessLayoutConfig {
  variant: ProcessLayout;
  showNumbers?: boolean;
  showConnectors?: boolean;
  connectorStyle?: "line" | "arrow" | "dotted" | "dashed";
  cardStyle?: "default" | "bordered" | "glass" | "gradient";
  iconStyle?: "default" | "gradient" | "filled" | "outlined";
  iconSize?: SectionSize;
  gap?: SectionSize;
}

// ============================================================================
// PROCESS SECTION PROPS
// ============================================================================

export interface ProcessSectionProps extends BaseSectionProps {
  header?: SectionHeaderConfig;
  steps: ProcessStepConfig[];
  layout?: ProcessLayoutConfig;
  showCTA?: {
    enabled: boolean;
    text: string;
    href: string;
  };
}

// ============================================================================
// PRESETS
// ============================================================================

export type ProcessPreset =
  | "default"
  | "timeline"
  | "horizontal-steps"
  | "cards"
  | "minimal"
  | "zigzag";

export interface ProcessPresetConfig {
  layout: ProcessLayoutConfig;
}

export const processPresets: Record<ProcessPreset, ProcessPresetConfig> = {
  default: {
    layout: {
      variant: "horizontal",
      showNumbers: true,
      showConnectors: true,
      connectorStyle: "line",
      cardStyle: "bordered",
      iconStyle: "gradient",
      iconSize: "md",
      gap: "lg",
    },
  },
  timeline: {
    layout: {
      variant: "timeline",
      showNumbers: true,
      showConnectors: true,
      connectorStyle: "line",
      cardStyle: "glass",
      iconStyle: "filled",
      iconSize: "lg",
      gap: "lg",
    },
  },
  "horizontal-steps": {
    layout: {
      variant: "horizontal",
      showNumbers: true,
      showConnectors: true,
      connectorStyle: "arrow",
      cardStyle: "default",
      iconStyle: "gradient",
      iconSize: "md",
      gap: "md",
    },
  },
  cards: {
    layout: {
      variant: "cards",
      showNumbers: true,
      showConnectors: false,
      cardStyle: "glass",
      iconStyle: "filled",
      iconSize: "lg",
      gap: "lg",
    },
  },
  minimal: {
    layout: {
      variant: "minimal",
      showNumbers: false,
      showConnectors: false,
      cardStyle: "default",
      iconStyle: "default",
      iconSize: "sm",
      gap: "md",
    },
  },
  zigzag: {
    layout: {
      variant: "zigzag",
      showNumbers: true,
      showConnectors: true,
      connectorStyle: "dotted",
      cardStyle: "bordered",
      iconStyle: "gradient",
      iconSize: "lg",
      gap: "xl",
    },
  },
};
