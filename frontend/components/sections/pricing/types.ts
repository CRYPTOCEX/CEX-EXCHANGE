import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { BaseSectionProps, SectionHeaderConfig, SectionSize } from "../shared/types";

// ============================================================================
// PRICING PLAN TYPES
// ============================================================================

export interface PricingFeature {
  text: string;
  included: boolean;
  tooltip?: string;
  highlighted?: boolean;
}

export interface PricingPlanConfig {
  id?: string;
  name: string;
  description?: string;
  price: {
    monthly: number | string;
    annual?: number | string;
    currency?: string;
    currencySymbol?: string;
  };
  badge?: string;
  popular?: boolean;
  icon?: LucideIcon;
  features: PricingFeature[];
  cta: {
    text: string;
    href: string;
    variant?: "primary" | "secondary" | "outline";
  };
  highlighted?: boolean;
  customContent?: ReactNode;
}

// ============================================================================
// LAYOUT TYPES
// ============================================================================

export type PricingLayout =
  | "cards"
  | "cards-stacked"
  | "table"
  | "compact"
  | "minimal"
  | "premium"
  | "toggle-cards";

export type PricingColumns = 2 | 3 | 4;

export interface PricingLayoutConfig {
  variant?: PricingLayout;
  columns?: PricingColumns;
  gap?: SectionSize;
  showBillingToggle?: boolean;
  defaultBilling?: "monthly" | "annual";
  cardStyle?: "default" | "bordered" | "elevated" | "glass" | "gradient";
  featureStyle?: "list" | "compact" | "detailed";
  highlightPopular?: boolean;
  showIcon?: boolean;
}

// ============================================================================
// PRICING SECTION PROPS
// ============================================================================

export interface PricingSectionProps extends BaseSectionProps {
  header?: SectionHeaderConfig;
  plans: PricingPlanConfig[];
  layout?: PricingLayoutConfig;
  showComparison?: boolean;
  comparisonFeatures?: string[];
  footer?: {
    text?: string;
    links?: {
      text: string;
      href: string;
    }[];
  };
}

// ============================================================================
// PRESETS
// ============================================================================

export type PricingPreset =
  | "default"
  | "minimal"
  | "premium"
  | "saas"
  | "startup"
  | "enterprise";

export interface PricingPresetConfig {
  layout: PricingLayoutConfig;
}

export const pricingPresets: Record<PricingPreset, PricingPresetConfig> = {
  default: {
    layout: {
      variant: "cards",
      columns: 3,
      gap: "lg",
      showBillingToggle: true,
      defaultBilling: "monthly",
      cardStyle: "bordered",
      featureStyle: "list",
      highlightPopular: true,
      showIcon: true,
    },
  },
  minimal: {
    layout: {
      variant: "minimal",
      columns: 3,
      gap: "md",
      showBillingToggle: false,
      cardStyle: "default",
      featureStyle: "compact",
      highlightPopular: false,
      showIcon: false,
    },
  },
  premium: {
    layout: {
      variant: "premium",
      columns: 3,
      gap: "lg",
      showBillingToggle: true,
      defaultBilling: "annual",
      cardStyle: "gradient",
      featureStyle: "detailed",
      highlightPopular: true,
      showIcon: true,
    },
  },
  saas: {
    layout: {
      variant: "cards",
      columns: 3,
      gap: "lg",
      showBillingToggle: true,
      defaultBilling: "monthly",
      cardStyle: "elevated",
      featureStyle: "list",
      highlightPopular: true,
      showIcon: true,
    },
  },
  startup: {
    layout: {
      variant: "compact",
      columns: 2,
      gap: "md",
      showBillingToggle: true,
      defaultBilling: "monthly",
      cardStyle: "glass",
      featureStyle: "compact",
      highlightPopular: false,
      showIcon: false,
    },
  },
  enterprise: {
    layout: {
      variant: "premium",
      columns: 4,
      gap: "md",
      showBillingToggle: true,
      defaultBilling: "annual",
      cardStyle: "bordered",
      featureStyle: "detailed",
      highlightPopular: true,
      showIcon: true,
    },
  },
};
