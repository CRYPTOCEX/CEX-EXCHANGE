interface NavColorSchema {
  // Primary color for active states, accents
  primary: string;
  // Secondary color for gradients, hover states
  secondary?: string;
  // Text colors
  text?: string;
  textHover?: string;
  textActive?: string;
  // Background colors
  bg?: string;
  bgHover?: string;
  bgActive?: string;
  // Border colors
  border?: string;
  borderActive?: string;
  // Gradient direction (for impressive effects)
  gradientDirection?: 'to-r' | 'to-l' | 'to-t' | 'to-b' | 'to-br' | 'to-bl' | 'to-tr' | 'to-tl';
  // Glow/shadow color
  glow?: string;
  // Indicator style for active items
  indicatorStyle?: 'underline' | 'pill' | 'glow' | 'gradient-underline' | 'dot';
}

interface MenuItem {
  key: string;
  title: string;
  href?: string;
  description?: string;
  icon?: string;
  image?: string;
  permission?: string | string[];

  child?: MenuItem[];
  megaMenu?: MenuItem[];
  multi_menu?: MenuItem[];
  nested?: MenuItem[];
  features?: string[];
  onClick?: () => void;

  extension?: string;
  settings?: string[];
  settingConditions?: Record<string, string>;
  env?: string;
  auth?: boolean;
  active?: boolean;
  disabled?: boolean;
  exact?: boolean; // If true, only match exact path (not startsWith)

  // Color schema for theming navigation items
  colorSchema?: NavColorSchema;
}

interface GetFilteredMenuOptions {
  user?: any;
  settings: Record<string, string>;
  extensions: string[];
  activeMenuType?: "user" | "admin" | "guest" | string;
}
