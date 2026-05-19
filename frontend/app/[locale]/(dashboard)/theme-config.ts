/**
 * Centralized Theme Configuration for Core Dashboard
 *
 * This file contains all color schema constants for the core dashboard admin modules.
 * Use these constants throughout dashboard pages and components for consistency.
 *
 * The core dashboard uses a professional, neutral theme distinct from extensions.
 *
 * Last updated: 2025-12-12
 */

// ============================================================================
// PAGE LAYOUT CONSTANTS
// ============================================================================
/**
 * Standard page padding for dashboard pages that don't use DataTable.
 * DataTable pages have their own padding, so they don't need this.
 * Usage: <div className={`container ${PAGE_PADDING}`}>...</div>
 */
export const PAGE_PADDING = "pt-24 pb-16";

// ============================================================================
// CORE DASHBOARD THEME - Slate & Zinc Professional Theme
// ============================================================================
export const CORE_THEME = {
  // Primary Brand Colors (Slate for Professional/Corporate)
  primary: {
    light: 'slate-500',
    main: 'slate-600',
    dark: 'slate-700',
    darkMode: 'slate-400',
  },

  // Secondary Brand Colors (Zinc for Neutral/Clean)
  secondary: {
    light: 'zinc-500',
    main: 'zinc-600',
    dark: 'zinc-700',
    darkMode: 'zinc-400',
  },

  // Accent Colors (Primary for CTAs)
  accent: {
    light: 'primary',
    main: 'primary',
    dark: 'primary',
  },

  // Status Colors
  status: {
    active: {
      bg: 'bg-green-100 dark:bg-green-500/20',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
    },
    pending: {
      bg: 'bg-amber-100 dark:bg-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
    },
    inactive: {
      bg: 'bg-zinc-100 dark:bg-zinc-500/20',
      text: 'text-zinc-600 dark:text-zinc-400',
      border: 'border-zinc-200 dark:border-zinc-800',
    },
    error: {
      bg: 'bg-red-100 dark:bg-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
    },
  },

  // Backgrounds
  bg: {
    card: 'bg-white dark:bg-zinc-900',
    cardBorder: 'border-zinc-200/50 dark:border-zinc-800/50',
    page: 'bg-gradient-to-b from-background via-muted/10 to-background',
    pageDark: 'dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950',
  },

  // Gradients - Using primary color (from CSS variable)
  gradients: {
    primary: 'from-slate-600 to-zinc-600',
    primaryVia: 'from-slate-600 via-zinc-500 to-slate-600',
    button: 'from-slate-600 to-zinc-600',
    buttonHover: 'hover:from-slate-700 hover:to-zinc-700',
    badge: 'from-slate-500/10 to-zinc-500/10',
    text: 'from-slate-600 to-zinc-600',
  },

  // Shadows
  shadows: {
    card: 'shadow-slate-500/10',
    cardHover: 'shadow-slate-500/20',
    button: 'shadow-lg shadow-slate-500/25',
  },
} as const;

// ============================================================================
// MODULE-SPECIFIC THEMES (Optional overrides for specific modules)
// ============================================================================

// API Management - Blue/Indigo theme for tech/security
export const API_THEME = {
  primary: { main: 'blue-600', darkMode: 'blue-400' },
  secondary: { main: 'indigo-600', darkMode: 'indigo-400' },
} as const;

// CRM - Emerald/Teal theme for people/relationships
export const CRM_THEME = {
  primary: { main: 'emerald-600', darkMode: 'emerald-400' },
  secondary: { main: 'teal-600', darkMode: 'teal-400' },
} as const;

// Finance - Green/Emerald theme for money/transactions
export const FINANCE_THEME = {
  primary: { main: 'green-600', darkMode: 'green-400' },
  secondary: { main: 'emerald-600', darkMode: 'emerald-400' },
} as const;

// Content - Purple/Violet theme for creative/media
export const CONTENT_THEME = {
  primary: { main: 'purple-600', darkMode: 'purple-400' },
  secondary: { main: 'violet-600', darkMode: 'violet-400' },
} as const;

// System - Slate/Gray theme for settings/config
export const SYSTEM_THEME = {
  primary: { main: 'slate-600', darkMode: 'slate-400' },
  secondary: { main: 'gray-600', darkMode: 'gray-400' },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the default design config for core dashboard datatables
 * This returns undefined for primaryColor/secondaryColor to use theme defaults
 */
export function getCoreDesignConfig(icon?: React.ComponentType) {
  return {
    animation: 'orbs' as const,
    icon,
  };
}

/**
 * Get module-specific theme
 */
export function getModuleTheme(module: 'api' | 'crm' | 'finance' | 'content' | 'system') {
  const themes = {
    api: API_THEME,
    crm: CRM_THEME,
    finance: FINANCE_THEME,
    content: CONTENT_THEME,
    system: SYSTEM_THEME,
  };
  return themes[module];
}
