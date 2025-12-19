/**
 * Navigation Color Schema Utilities
 *
 * This file provides utility functions for working with navigation color schemas.
 * The actual color schema definitions are in theme-config.ts for single source of truth.
 */

// Re-export NAV_COLOR_SCHEMAS from theme-config for backward compatibility
export { NAV_COLOR_SCHEMAS, getNavColorSchema, type NavColorSchema } from '@/app/[locale]/(ext)/theme-config';

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
