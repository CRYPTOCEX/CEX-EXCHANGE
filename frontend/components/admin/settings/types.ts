import type { ElementType, ReactNode } from "react";

export type FieldType =
  | "switch"
  | "text"
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
  fileSize?: { width: number; height: number };
  preview?: Record<string, Record<string, string>>;
  fullWidth?: boolean;
  // For custom field type - render a custom component
  customRender?: React.ComponentType<CustomComponentProps>;
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
  gradient: string;
  glow: string;
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
}

// Default tab colors that can be used
export const DEFAULT_TAB_COLORS: Record<string, TabColors> = {
  general: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
    gradient: "from-blue-500/20 via-blue-400/10 to-transparent",
    glow: "shadow-blue-500/20",
    iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
  },
  features: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    border: "border-purple-500/20",
    gradient: "from-purple-500/20 via-purple-400/10 to-transparent",
    glow: "shadow-purple-500/20",
    iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
  },
  wallet: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    gradient: "from-emerald-500/20 via-emerald-400/10 to-transparent",
    glow: "shadow-emerald-500/20",
    iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
  },
  social: {
    bg: "bg-pink-500/10",
    text: "text-pink-500",
    border: "border-pink-500/20",
    gradient: "from-pink-500/20 via-pink-400/10 to-transparent",
    glow: "shadow-pink-500/20",
    iconBg: "bg-gradient-to-br from-pink-500 to-pink-600",
  },
  logos: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
    gradient: "from-amber-500/20 via-amber-400/10 to-transparent",
    glow: "shadow-amber-500/20",
    iconBg: "bg-gradient-to-br from-amber-500 to-amber-600",
  },
  platform: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
    gradient: "from-blue-500/20 via-blue-400/10 to-transparent",
    glow: "shadow-blue-500/20",
    iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
  },
  trading: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/20",
    gradient: "from-green-500/20 via-green-400/10 to-transparent",
    glow: "shadow-green-500/20",
    iconBg: "bg-gradient-to-br from-green-500 to-green-600",
  },
  fees: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    border: "border-orange-500/20",
    gradient: "from-orange-500/20 via-orange-400/10 to-transparent",
    glow: "shadow-orange-500/20",
    iconBg: "bg-gradient-to-br from-orange-500 to-orange-600",
  },
  security: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
    gradient: "from-red-500/20 via-red-400/10 to-transparent",
    glow: "shadow-red-500/20",
    iconBg: "bg-gradient-to-br from-red-500 to-red-600",
  },
  commission: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    border: "border-cyan-500/20",
    gradient: "from-cyan-500/20 via-cyan-400/10 to-transparent",
    glow: "shadow-cyan-500/20",
    iconBg: "bg-gradient-to-br from-cyan-500 to-cyan-600",
  },
  earnings: {
    bg: "bg-violet-500/10",
    text: "text-violet-500",
    border: "border-violet-500/20",
    gradient: "from-violet-500/20 via-violet-400/10 to-transparent",
    glow: "shadow-violet-500/20",
    iconBg: "bg-gradient-to-br from-violet-500 to-violet-600",
  },
};
