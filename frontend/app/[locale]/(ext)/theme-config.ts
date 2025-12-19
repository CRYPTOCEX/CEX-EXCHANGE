/**
 * Extension Theme Configuration
 *
 * This file contains navigation color schemas for extension navbars.
 * Component colors should use direct Tailwind classes instead of theme variables.
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
