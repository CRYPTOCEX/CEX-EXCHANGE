import { BaseSectionProps, SectionHeaderConfig } from "../shared/types";

export interface FAQItemConfig {
  id?: string;
  question: string;
  answer: string;
  category?: string;
  highlighted?: boolean;
}

export interface FAQLayoutConfig {
  variant: "accordion" | "grid" | "two-column";
  showCategories?: boolean;
  defaultOpen?: number | null;
  allowMultipleOpen?: boolean;
}

export interface FAQSectionProps extends BaseSectionProps {
  header?: SectionHeaderConfig;
  faqs: FAQItemConfig[];
  layout?: FAQLayoutConfig;
  categories?: string[];
}

export type FAQPreset = "default" | "two-column" | "grid";

export const faqPresets: Record<FAQPreset, { layout: FAQLayoutConfig }> = {
  default: {
    layout: {
      variant: "accordion",
      showCategories: false,
      defaultOpen: null,
      allowMultipleOpen: false,
    },
  },
  "two-column": {
    layout: {
      variant: "two-column",
      showCategories: true,
      defaultOpen: null,
      allowMultipleOpen: true,
    },
  },
  grid: {
    layout: {
      variant: "grid",
      showCategories: false,
      defaultOpen: null,
      allowMultipleOpen: true,
    },
  },
};
