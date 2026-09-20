import type { ElementType, ReactNode } from "react";

export type FieldType =
  | "switch"
  | "text"
  | "textarea" // Multi-line free text (lists, paragraphs)
  | "input"  // Generic input field - use inputType to specify HTML input type
  | "number"
  | "range"
  | "url"
  | "select"
  | "file"
  | "mlm"
  | "socialLinks"
  | "custom";

export interface SocialLink {
  id: string;
  name: string;
  url: string;
  icon: string;
}

// Props passed to custom field/tab components
export interface CustomComponentProps {
  formValues: Record<string, any>;
  handleChange: (key: string, value: any) => void;
  settings?: Record<string, any>;
  /* Card-level chips (category, "requires addon") for the custom field to place
     beside its own label — same contract as SettingsField's `meta`. Optional:
     a custom component that ignores it simply renders no chips. */
  meta?: ReactNode;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  description?: string;
  options?: { label: string; value: string }[];
  category: string;
  subcategory?: string;
  showIf?: (values: Record<string, string>) => boolean;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string; // e.g., "%" for percentages, "min" for minutes
  placeholder?: string; // Custom placeholder text for input fields
  inputType?: "text" | "number" | "email" | "password" | "url"; // HTML input type override
  fileSize?: { width: number; height: number };
  preview?: Record<string, Record<string, string>>;
  fullWidth?: boolean;
  // For custom field type - render a custom component
  customRender?: React.ComponentType<CustomComponentProps>;
  // Optional addon module path that must be available for this field to show
  // e.g., "@/components/(ext)/chart-engine" - field will be hidden if addon is not installed
  addonRequired?: string;
}

export interface TabDefinition {
  id: string;
  label: string;
  icon?: ElementType;
  description?: string;
  // For tabs that need entirely custom content (no fields)
  customContent?: React.ComponentType<CustomComponentProps>;
}

export interface TabColors {
  bg: string;
  text: string;
  border: string;
  iconBg: string;
}

export interface SettingsPageConfig {
  // Page metadata
  title: string;
  description: string;
  backUrl?: string;

  // Tabs and fields
  tabs: TabDefinition[];
  fields: FieldDefinition[];

  // Theme colors per tab
  tabColors?: Record<string, TabColors>;

  // API endpoint
  apiEndpoint?: string;

  // Default values for settings (used for newly installed sites)
  defaultValues?: Record<string, any>;

  // Callbacks
  onBeforeSave?: (settings: Record<string, any>) => Record<string, any>;
  onAfterSave?: (settings: Record<string, any>) => void;

  /**
   * Async gate between "the admin pressed Save" and the request going out.
   *
   * Receives the payload that is about to be sent and returns either a payload
   * to send (usually the same one, optionally with extra keys) or `null` to
   * abandon the save and leave the form dirty and intact.
   *
   * `onBeforeSave` cannot serve this purpose: it is synchronous, so it can
   * transform a payload but can never wait for an answer. Anything that has to
   * ask the SERVER what a change would do — and then ask the ADMIN whether they
   * still want it — needs to await twice before the write, which is exactly
   * what the geographic restriction screen does to stop an operator saving a
   * policy that would refuse every visitor including themselves.
   */
  onBeforeSaveAsync?: (
    payload: Record<string, any>
  ) => Promise<Record<string, any> | null>;
}

// Default tab colors that can be used
export const DEFAULT_TAB_COLORS: Record<string, TabColors> = {
  general: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  features: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  wallet: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  social: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  logos: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  platform: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  trading: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  fees: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  security: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  commission: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
  earnings: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    iconBg: "bg-primary",
  },
};
