/**
 * Navigation Color Schema Utilities
 *
 * This file provides utility functions for working with navigation color schemas.
 * Contains all color schema definitions as the single source of truth.
 */

// ============================================================================
// NAVIGATION COLOR SCHEMAS
// ============================================================================

export interface NavColorSchema {
  primary: string;
  secondary?: string;
  text: string;
  textHover: string;
  textActive: string;
  bgHover: string;
  bgActive: string;
  borderActive: string;
  glow: string;
  indicatorStyle?: 'underline' | 'gradient-underline' | 'pill' | 'dot' | 'glow';
  gradientDirection?: 'to-r' | 'to-l' | 'to-t' | 'to-b' | 'to-br' | 'to-bl' | 'to-tr' | 'to-tl';
}

/**
 * Navigation color schemas for extension navbars
 * These define the colors used for active states, hover effects, and indicators
 */
export const NAV_COLOR_SCHEMAS: Record<string, NavColorSchema> = {
  // Gateway - Indigo/Cyan Security Theme
  gateway: {
    primary: 'indigo',
    secondary: 'cyan',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-indigo-600 dark:text-indigo-400',
    textActive: 'text-indigo-600 dark:text-indigo-400',
    bgHover: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30',
    bgActive: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderActive: 'border-indigo-500 dark:border-indigo-400',
    glow: 'shadow-indigo-500/20 dark:shadow-indigo-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // Copy Trading - Indigo/Violet Expert Theme
  'copy-trading': {
    primary: 'indigo',
    secondary: 'violet',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-indigo-600 dark:text-indigo-400',
    textActive: 'text-indigo-600 dark:text-indigo-400',
    bgHover: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30',
    bgActive: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderActive: 'border-indigo-500 dark:border-indigo-400',
    glow: 'shadow-indigo-500/20 dark:shadow-indigo-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // Forex - Emerald/Teal Wealth Theme
  forex: {
    primary: 'emerald',
    secondary: 'teal',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-emerald-600 dark:text-emerald-400',
    textActive: 'text-emerald-600 dark:text-emerald-400',
    bgHover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
    bgActive: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderActive: 'border-emerald-500 dark:border-emerald-400',
    glow: 'shadow-emerald-500/20 dark:shadow-emerald-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // Staking - Violet/Indigo Premium Theme
  staking: {
    primary: 'violet',
    secondary: 'indigo',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-violet-600 dark:text-violet-400',
    textActive: 'text-violet-600 dark:text-violet-400',
    bgHover: 'hover:bg-violet-50 dark:hover:bg-violet-950/30',
    bgActive: 'bg-violet-50 dark:bg-violet-950/30',
    borderActive: 'border-violet-500 dark:border-violet-400',
    glow: 'shadow-violet-500/20 dark:shadow-violet-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // P2P - Blue/Violet Trust Theme
  p2p: {
    primary: 'blue',
    secondary: 'violet',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-blue-600 dark:text-blue-400',
    textActive: 'text-blue-600 dark:text-blue-400',
    bgHover: 'hover:bg-blue-50 dark:hover:bg-blue-950/30',
    bgActive: 'bg-blue-50 dark:bg-blue-950/30',
    borderActive: 'border-blue-500 dark:border-blue-400',
    glow: 'shadow-blue-500/20 dark:shadow-blue-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // ICO - Teal/Cyan Launch Theme
  ico: {
    primary: 'teal',
    secondary: 'cyan',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-teal-600 dark:text-teal-400',
    textActive: 'text-teal-600 dark:text-teal-400',
    bgHover: 'hover:bg-teal-50 dark:hover:bg-teal-950/30',
    bgActive: 'bg-teal-50 dark:bg-teal-950/30',
    borderActive: 'border-teal-500 dark:border-teal-400',
    glow: 'shadow-teal-500/20 dark:shadow-teal-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // Affiliate/MLM - Blue/Amber Trust/Rewards Theme
  affiliate: {
    primary: 'blue',
    secondary: 'amber',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-blue-600 dark:text-blue-400',
    textActive: 'text-blue-600 dark:text-blue-400',
    bgHover: 'hover:bg-blue-50 dark:hover:bg-blue-950/30',
    bgActive: 'bg-blue-50 dark:bg-blue-950/30',
    borderActive: 'border-blue-500 dark:border-blue-400',
    glow: 'shadow-blue-500/20 dark:shadow-blue-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // MLM alias for affiliate
  mlm: {
    primary: 'blue',
    secondary: 'amber',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-blue-600 dark:text-blue-400',
    textActive: 'text-blue-600 dark:text-blue-400',
    bgHover: 'hover:bg-blue-50 dark:hover:bg-blue-950/30',
    bgActive: 'bg-blue-50 dark:bg-blue-950/30',
    borderActive: 'border-blue-500 dark:border-blue-400',
    glow: 'shadow-blue-500/20 dark:shadow-blue-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // Ecommerce - Amber/Emerald Shopping Theme
  ecommerce: {
    primary: 'amber',
    secondary: 'emerald',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-amber-600 dark:text-amber-400',
    textActive: 'text-amber-600 dark:text-amber-400',
    bgHover: 'hover:bg-amber-50 dark:hover:bg-amber-950/30',
    bgActive: 'bg-amber-50 dark:bg-amber-950/30',
    borderActive: 'border-amber-500 dark:border-amber-400',
    glow: 'shadow-amber-500/20 dark:shadow-amber-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // FAQ/Knowledge Base - Sky/Blue Knowledge Theme
  faq: {
    primary: 'sky',
    secondary: 'blue',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-sky-600 dark:text-sky-400',
    textActive: 'text-sky-600 dark:text-sky-400',
    bgHover: 'hover:bg-sky-50 dark:hover:bg-sky-950/30',
    bgActive: 'bg-sky-50 dark:bg-sky-950/30',
    borderActive: 'border-sky-500 dark:border-sky-400',
    glow: 'shadow-sky-500/20 dark:shadow-sky-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // Knowledge Base alias for FAQ
  knowledge_base: {
    primary: 'sky',
    secondary: 'blue',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-sky-600 dark:text-sky-400',
    textActive: 'text-sky-600 dark:text-sky-400',
    bgHover: 'hover:bg-sky-50 dark:hover:bg-sky-950/30',
    bgActive: 'bg-sky-50 dark:bg-sky-950/30',
    borderActive: 'border-sky-500 dark:border-sky-400',
    glow: 'shadow-sky-500/20 dark:shadow-sky-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // NFT - Purple/Pink Digital Art Theme
  nft: {
    primary: 'purple',
    secondary: 'pink',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-purple-600 dark:text-purple-400',
    textActive: 'text-purple-600 dark:text-purple-400',
    bgHover: 'hover:bg-purple-50 dark:hover:bg-purple-950/30',
    bgActive: 'bg-purple-50 dark:bg-purple-950/30',
    borderActive: 'border-purple-500 dark:border-purple-400',
    glow: 'shadow-purple-500/20 dark:shadow-purple-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // AI Trading - Cyan/Purple Futuristic Theme
  ai: {
    primary: 'cyan',
    secondary: 'purple',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-cyan-600 dark:text-cyan-400',
    textActive: 'text-cyan-600 dark:text-cyan-400',
    bgHover: 'hover:bg-cyan-50 dark:hover:bg-cyan-950/30',
    bgActive: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderActive: 'border-cyan-500 dark:border-cyan-400',
    glow: 'shadow-cyan-500/20 dark:shadow-cyan-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // Binary AI Engine - Rose/Pink AI Automation Theme
  'binary-engine': {
    primary: 'rose',
    secondary: 'pink',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-rose-600 dark:text-rose-400',
    textActive: 'text-rose-600 dark:text-rose-400',
    bgHover: 'hover:bg-rose-50 dark:hover:bg-rose-950/30',
    bgActive: 'bg-rose-50 dark:bg-rose-950/30',
    borderActive: 'border-rose-500 dark:border-rose-400',
    glow: 'shadow-rose-500/20 dark:shadow-rose-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // Ecosystem - Blue/Cyan Blockchain Theme
  ecosystem: {
    primary: 'blue',
    secondary: 'cyan',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-blue-600 dark:text-blue-400',
    textActive: 'text-blue-600 dark:text-blue-400',
    bgHover: 'hover:bg-blue-50 dark:hover:bg-blue-950/30',
    bgActive: 'bg-blue-50 dark:bg-blue-950/30',
    borderActive: 'border-blue-500 dark:border-blue-400',
    glow: 'shadow-blue-500/20 dark:shadow-blue-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // Futures - Amber/Red High-Risk Trading Theme
  futures: {
    primary: 'amber',
    secondary: 'red',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-amber-600 dark:text-amber-400',
    textActive: 'text-amber-600 dark:text-amber-400',
    bgHover: 'hover:bg-amber-50 dark:hover:bg-amber-950/30',
    bgActive: 'bg-amber-50 dark:bg-amber-950/30',
    borderActive: 'border-amber-500 dark:border-amber-400',
    glow: 'shadow-amber-500/20 dark:shadow-amber-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // Mailwizard - Violet/Rose Communication Theme
  mailwizard: {
    primary: 'violet',
    secondary: 'rose',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-violet-600 dark:text-violet-400',
    textActive: 'text-violet-600 dark:text-violet-400',
    bgHover: 'hover:bg-violet-50 dark:hover:bg-violet-950/30',
    bgActive: 'bg-violet-50 dark:bg-violet-950/30',
    borderActive: 'border-violet-500 dark:border-violet-400',
    glow: 'shadow-violet-500/20 dark:shadow-violet-400/20',
    indicatorStyle: 'gradient-underline',
    gradientDirection: 'to-r',
  },

  // Default - Primary Theme
  default: {
    primary: 'primary',
    text: 'text-zinc-600 dark:text-zinc-400',
    textHover: 'text-primary',
    textActive: 'text-primary',
    bgHover: 'hover:bg-primary/5',
    bgActive: 'bg-primary/5',
    borderActive: 'border-primary',
    glow: 'shadow-primary/20',
    indicatorStyle: 'underline',
  },
} as const;

/**
 * Get navigation color schema for an extension
 */
export function getNavColorSchema(extensionName?: string): NavColorSchema {
  if (!extensionName) return NAV_COLOR_SCHEMAS.default;
  return NAV_COLOR_SCHEMAS[extensionName] || NAV_COLOR_SCHEMAS.default;
}

// Tailwind color hex values for CSS-in-JS usage
export const COLOR_HEX_MAP: Record<string, { light: string; dark: string }> = {
  primary: { light: 'hsl(var(--primary))', dark: 'hsl(var(--primary))' },
  indigo: { light: '#4f46e5', dark: '#818cf8' },
  purple: { light: '#9333ea', dark: '#a855f7' },
  violet: { light: '#7c3aed', dark: '#a78bfa' },
  fuchsia: { light: '#c026d3', dark: '#e879f9' },
  pink: { light: '#db2777', dark: '#f472b6' },
  rose: { light: '#e11d48', dark: '#fb7185' },
  red: { light: '#dc2626', dark: '#f87171' },
  orange: { light: '#ea580c', dark: '#fb923c' },
  amber: { light: '#d97706', dark: '#fbbf24' },
  yellow: { light: '#ca8a04', dark: '#facc15' },
  lime: { light: '#65a30d', dark: '#a3e635' },
  green: { light: '#16a34a', dark: '#4ade80' },
  emerald: { light: '#059669', dark: '#34d399' },
  teal: { light: '#0d9488', dark: '#2dd4bf' },
  cyan: { light: '#0891b2', dark: '#22d3ee' },
  sky: { light: '#0284c7', dark: '#38bdf8' },
  blue: { light: '#2563eb', dark: '#60a5fa' },
};

/**
 * Get hex color value for a color name
 */
export function getColorHex(colorName: string, isDark: boolean = false): string {
  const color = COLOR_HEX_MAP[colorName];
  if (!color) return isDark ? '#a855f7' : '#9333ea'; // fallback to purple
  return isDark ? color.dark : color.light;
}

/**
 * Generate CSS gradient string for navigation indicator
 */
export function getGradientStyle(schema: NavColorSchema, isDark: boolean = false): string {
  const primary = getColorHex(schema.primary, isDark);
  const secondary = schema.secondary ? getColorHex(schema.secondary, isDark) : primary;
  const direction = schema.gradientDirection || 'to-r';

  const directionMap: Record<string, string> = {
    'to-r': 'to right',
    'to-l': 'to left',
    'to-t': 'to top',
    'to-b': 'to bottom',
    'to-br': 'to bottom right',
    'to-bl': 'to bottom left',
    'to-tr': 'to top right',
    'to-tl': 'to top left',
  };

  return `linear-gradient(${directionMap[direction]}, ${primary}, ${secondary})`;
}

/**
 * Generate glow/shadow style for active items
 */
export function getGlowStyle(schema: NavColorSchema, isDark: boolean = false): string {
  const primary = getColorHex(schema.primary, isDark);
  return `0 0 20px ${primary}40, 0 0 40px ${primary}20`;
}

/**
 * Get all classes for a nav item based on state
 */
export function getNavItemClasses(
  schema: NavColorSchema,
  isActive: boolean,
  isHovered: boolean = false
): string {
  const classes: string[] = [];

  if (isActive) {
    if (schema.textActive) classes.push(schema.textActive);
    if (schema.bgActive) classes.push(schema.bgActive);
  } else if (isHovered) {
    if (schema.textHover) classes.push(schema.textHover);
  } else {
    if (schema.text) classes.push(schema.text);
  }

  if (!isActive && schema.bgHover) {
    classes.push(schema.bgHover);
  }

  return classes.join(' ');
}

/**
 * Get indicator classes based on style
 */
export function getIndicatorClasses(schema: NavColorSchema, isActive: boolean): string {
  if (!isActive) return '';

  switch (schema.indicatorStyle) {
    case 'pill':
      return `rounded-full ${schema.bgActive || 'bg-primary/10'}`;
    case 'glow':
      return 'shadow-lg';
    case 'gradient-underline':
    case 'underline':
    default:
      return `border-b-2 ${schema.borderActive || 'border-primary'}`;
  }
}
