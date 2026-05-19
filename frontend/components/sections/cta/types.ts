import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { BaseSectionProps, SectionSize, ButtonConfig } from "../shared/types";

// ============================================================================
// CTA TYPES
// ============================================================================

export type CTALayout =
  | "centered"
  | "split"
  | "inline"
  | "newsletter"
  | "minimal"
  | "banner"
  | "cards";

// CTA Card configuration for "cards" variant
export interface CTACardConfig {
  variant: "primary" | "secondary";
  icon: LucideIcon;
  title: string;
  description: string;
  buttonText: string;
  href: string;
  buttonIcon?: LucideIcon;
  gradient?: { from: string; to: string };
}

export interface CTAContentConfig {
  tag?: {
    text: string;
    icon?: LucideIcon;
  };
  title: string;
  titleHighlight?: string;
  subtitle?: string;
  buttons?: ButtonConfig[];
  // Newsletter specific
  newsletter?: {
    placeholder?: string;
    buttonText?: string;
    privacyText?: string;
    onSubmit?: (email: string) => void | Promise<void>;
  };
  // Custom content
  customContent?: ReactNode;
  visual?: {
    type: "image" | "illustration" | "icon" | "custom";
    src?: string;
    icon?: LucideIcon;
    content?: ReactNode;
  };
  // Trust items for cards variant
  trustItems?: Array<{
    icon: LucideIcon;
    text: string;
  }>;
  // CTA Cards for cards variant
  cards?: CTACardConfig[];
}

export interface CTALayoutConfig {
  variant: CTALayout;
  size?: SectionSize;
  alignment?: "left" | "center" | "right";
  visualPosition?: "left" | "right" | "top" | "bottom";
  cardStyle?:
    | "default"
    | "bordered"
    | "elevated"
    | "glass"
    | "gradient"
    | "gradient-soft";
  fullWidth?: boolean;
  showDots?: boolean;
  // For "cards" variant: choose between cards or buttons for actions
  actionStyle?: "cards" | "buttons";
}

// ============================================================================
// CTA SECTION PROPS
// ============================================================================

export interface CTASectionProps extends BaseSectionProps {
  content: CTAContentConfig;
  layout?: CTALayoutConfig;
}

// ============================================================================
// PRESETS
// ============================================================================

export type CTAPreset =
  | "default"
  | "newsletter"
  | "split-visual"
  | "centered-minimal"
  | "banner"
  | "gradient-box"
  | "cards-split";

export interface CTAPresetConfig {
  layout: CTALayoutConfig;
}

export const ctaPresets: Record<CTAPreset, CTAPresetConfig> = {
  default: {
    layout: {
      variant: "centered",
      size: "lg",
      alignment: "center",
      cardStyle: "bordered",
      fullWidth: false,
    },
  },
  newsletter: {
    layout: {
      variant: "newsletter",
      size: "md",
      alignment: "center",
      cardStyle: "glass",
      fullWidth: false,
    },
  },
  "split-visual": {
    layout: {
      variant: "split",
      size: "lg",
      alignment: "left",
      visualPosition: "right",
      cardStyle: "elevated",
      fullWidth: false,
    },
  },
  "centered-minimal": {
    layout: {
      variant: "minimal",
      size: "md",
      alignment: "center",
      cardStyle: "default",
      fullWidth: false,
    },
  },
  banner: {
    layout: {
      variant: "banner",
      size: "sm",
      alignment: "center",
      cardStyle: "gradient",
      fullWidth: true,
    },
  },
  "gradient-box": {
    layout: {
      variant: "centered",
      size: "lg",
      alignment: "center",
      cardStyle: "gradient",
      fullWidth: false,
    },
  },
  "cards-split": {
    layout: {
      variant: "cards",
      size: "xl",
      alignment: "left",
      fullWidth: true,
      showDots: false,
    },
  },
};
