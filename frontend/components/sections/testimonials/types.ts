import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { BaseSectionProps, SectionHeaderConfig, SectionSize } from "../shared/types";

// ============================================================================
// TESTIMONIAL ITEM TYPES
// ============================================================================

export interface TestimonialAuthor {
  name: string;
  role?: string;
  company?: string;
  avatar?: string;
  initials?: string;
}

export interface TestimonialItemConfig {
  id?: string;
  content: string;
  author: TestimonialAuthor;
  rating?: number;
  date?: string;
  featured?: boolean;
  logo?: string;
  metrics?: {
    value: string;
    label: string;
  };
}

// ============================================================================
// LAYOUT TYPES
// ============================================================================

export type TestimonialsLayout =
  | "grid"
  | "carousel"
  | "masonry"
  | "cards"
  | "spotlight"
  | "quote-wall"
  | "minimal"
  | "video-cards";

export type TestimonialsColumns = 1 | 2 | 3 | 4;

export interface TestimonialsLayoutConfig {
  variant?: TestimonialsLayout;
  columns?: TestimonialsColumns;
  gap?: SectionSize;
  showRating?: boolean;
  showLogo?: boolean;
  showDate?: boolean;
  cardStyle?: "default" | "bordered" | "elevated" | "glass" | "gradient-accent";
  avatarStyle?: "circle" | "square" | "rounded";
  avatarSize?: SectionSize;
  quoteStyle?: "default" | "large" | "minimal" | "accent-line";
  autoplay?: boolean;
  autoplayInterval?: number;
}

// ============================================================================
// TESTIMONIALS SECTION PROPS
// ============================================================================

export interface TestimonialsSectionProps extends BaseSectionProps {
  header?: SectionHeaderConfig;
  testimonials: TestimonialItemConfig[];
  layout?: TestimonialsLayoutConfig;
  showTrustBadge?: boolean;
  trustBadge?: {
    text: string;
    icon?: LucideIcon;
    rating?: number;
    reviewCount?: number;
  };
}

// ============================================================================
// PRESETS
// ============================================================================

export type TestimonialsPreset =
  | "default"
  | "carousel"
  | "masonry"
  | "spotlight"
  | "minimal"
  | "glass-cards"
  | "quote-wall";

export interface TestimonialsPresetConfig {
  layout: TestimonialsLayoutConfig;
}

export const testimonialsPresets: Record<TestimonialsPreset, TestimonialsPresetConfig> = {
  default: {
    layout: {
      variant: "grid",
      columns: 3,
      gap: "lg",
      showRating: true,
      cardStyle: "bordered",
      avatarStyle: "circle",
      quoteStyle: "default",
    },
  },
  carousel: {
    layout: {
      variant: "carousel",
      columns: 1,
      gap: "md",
      showRating: true,
      cardStyle: "elevated",
      avatarStyle: "circle",
      avatarSize: "lg",
      quoteStyle: "large",
      autoplay: true,
      autoplayInterval: 5000,
    },
  },
  masonry: {
    layout: {
      variant: "masonry",
      columns: 3,
      gap: "md",
      showRating: false,
      cardStyle: "glass",
      avatarStyle: "rounded",
      quoteStyle: "minimal",
    },
  },
  spotlight: {
    layout: {
      variant: "spotlight",
      columns: 1,
      gap: "lg",
      showRating: true,
      showLogo: true,
      cardStyle: "gradient-accent",
      avatarStyle: "circle",
      avatarSize: "lg",
      quoteStyle: "large",
    },
  },
  minimal: {
    layout: {
      variant: "minimal",
      columns: 2,
      gap: "md",
      showRating: false,
      cardStyle: "default",
      avatarStyle: "circle",
      quoteStyle: "accent-line",
    },
  },
  "glass-cards": {
    layout: {
      variant: "cards",
      columns: 3,
      gap: "lg",
      showRating: true,
      cardStyle: "glass",
      avatarStyle: "circle",
      quoteStyle: "default",
    },
  },
  "quote-wall": {
    layout: {
      variant: "quote-wall",
      columns: 4,
      gap: "sm",
      showRating: false,
      cardStyle: "bordered",
      avatarStyle: "circle",
      avatarSize: "sm",
      quoteStyle: "minimal",
    },
  },
};
