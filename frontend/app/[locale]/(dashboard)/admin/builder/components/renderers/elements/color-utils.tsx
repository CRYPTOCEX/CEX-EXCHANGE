import type React from "react";
import { useMemo } from "react";
import { useTheme } from "next-themes";

// Optimized types for color handling
export interface ThemeColor {
  light?: string;
  dark?: string;
  type?: never;
}

export interface GradientDefinition {
  direction?: string;
  from?: string;
  via?: string;
  to?: string;
  dark?: GradientDefinition;
  light?: GradientDefinition;
}

export interface GradientColor {
  type: "gradient";
  gradient: GradientDefinition;
}

export type ColorValue = string | ThemeColor | GradientColor;

// Type guards with better performance
export const isGradientColor = (color: any): color is GradientColor => {
  return color?.type === "gradient" && color?.gradient;
};

export const isThemeColor = (color: any): color is ThemeColor => {
  return typeof color === "object" && color !== null && !color?.type;
};

// Cache for color computations
const colorCache = new Map<string, string>();
const gradientCache = new Map<string, string[]>();

// Generate cache key for colors
const getColorCacheKey = (color: ColorValue, theme: string): string => {
  return `${JSON.stringify(color)}-${theme}`;
};

// Optimized theme color resolver with caching
export const getThemeColor = (
  colorValue: ColorValue | undefined,
  theme: string = "light"
): string | undefined => {
  if (!colorValue) return undefined;

  const cacheKey = getColorCacheKey(colorValue, theme);

  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey);
  }

  let result: string | undefined;

  if (isThemeColor(colorValue)) {
    result = theme === "dark" ? colorValue.dark : colorValue.light;
  } else if (typeof colorValue === "string") {
    result = colorValue;
  }

  if (result) {
    // Limit cache size
    if (colorCache.size > 500) {
      const firstKey = colorCache.keys().next().value;
      if (firstKey) {
        colorCache.delete(firstKey);
      }
    }
    colorCache.set(cacheKey, result);
  }

  return result;
};

// Detect whether a color stop is an explicit CSS color (hex/rgb/hsl) rather
// than a Tailwind color name like "indigo-500".
export const isExplicitCssColor = (c: string | undefined): boolean => {
  if (!c) return false;
  return /^#|^rgb\(|^rgba\(|^hsl\(|^hsla\(/i.test(c.trim());
};

/**
 * Unwrap a Tailwind arbitrary-value fragment into the CSS inside it:
 * `[hsl(var(--primary))]` -> `hsl(var(--primary))`,
 * `[hsl(var(--card)/0.72)]` -> `hsl(var(--card) / 0.72)`.
 *
 * That fragment form is what the design system stores for a colour (see
 * `tailwindSafelist` in `builder/templates/utils.ts`), because it is the only
 * form that is both theme-aware and paintable by the class-based renderers.
 * Anything that needs REAL css — a gradient stop, an inline style — has to
 * unwrap it first, which is what this does.
 *
 * Tailwind's own syntax uses `_` for spaces inside an arbitrary value, so those
 * are restored too.
 */
export const unwrapArbitraryColor = (c: string | undefined): string | undefined => {
  if (!c) return c;
  const m = c.trim().match(/^\[(.+)\]$/);
  if (!m) return c;
  return m[1].replace(/_/g, " ").replace(/\/(?=[\d.])/, " / ");
};

/** True for a real CSS colour OR a fragment that unwraps to one. */
export const isPaintableColor = (c: string | undefined): boolean =>
  isExplicitCssColor(unwrapArbitraryColor(c));

const GRADIENT_DIRECTION_MAP: Record<string, string> = {
  "to-r": "to right",
  "to-l": "to left",
  "to-t": "to top",
  "to-b": "to bottom",
  "to-tr": "to top right",
  "to-tl": "to top left",
  "to-br": "to bottom right",
  "to-bl": "to bottom left",
};

// Convert a GradientDefinition to an inline-CSS linear-gradient() string when
// any of its stops are explicit CSS colors (hex/rgb/hsl). Returns null when
// all stops are Tailwind color names so callers can fall back to class-based
// emission.
export const gradientToCss = (
  gradientValue: GradientDefinition | undefined,
  theme: string = "light"
): string | null => {
  if (!gradientValue) return null;

  const pick =
    theme === "dark" && gradientValue.dark
      ? gradientValue.dark
      : theme === "light" && gradientValue.light
        ? gradientValue.light
        : gradientValue;

  const direction = pick.direction || "to-br";
  /**
   * Stops are unwrapped from the `[hsl(var(--x))]` fragment the colour picker
   * stores. Without this the guard below saw a non-CSS string, returned null,
   * and `resolveBackgroundColor` fell through to emitting
   * `from-[hsl(var(--x))]` / `to-…` as CLASSES — which are assembled at runtime
   * and are not in `tailwindSafelist`, so no builder gradient painted at all.
   * Unwrapping closes that chain: the picker's tokens now reach the page as a
   * real `linear-gradient`, and being `var()`-based they follow the theme.
   */
  const from = unwrapArbitraryColor(pick.from);
  const via = unwrapArbitraryColor(pick.via);
  const to = unwrapArbitraryColor(pick.to);

  if (!from || !to) return null;

  const anyExplicit =
    isExplicitCssColor(from) ||
    isExplicitCssColor(to) ||
    (via ? isExplicitCssColor(via) : false);

  if (!anyExplicit) return null;

  const cssDir = GRADIENT_DIRECTION_MAP[direction] || direction;
  const stops = via ? `${from}, ${via}, ${to}` : `${from}, ${to}`;
  return `linear-gradient(${cssDir}, ${stops})`;
};

// React hook variant.
export const useGradientCss = (
  gradientValue: GradientDefinition | undefined
): string | null => {
  const { theme } = useTheme();
  return useMemo(
    () => gradientToCss(gradientValue, theme),
    [gradientValue, theme]
  );
};

// Resolve a ColorValue to a concrete style fragment suitable for inline CSS
// and/or a list of Tailwind classes. This is the central helper used by the
// button renderer (and any other renderer that needs to accept all three
// color shapes for a single property).
//
// Returns:
//   - styles: CSS properties to merge onto the element
//   - classes: Tailwind classes to add
//
// For gradients with explicit hex/rgb stops we emit an inline
// `background-image: linear-gradient(...)` and force `backgroundColor:
// transparent` so the gradient is visible. For gradients with Tailwind color
// names we emit classes. For theme-aware objects with Tailwind values we emit
// classes; for theme-aware objects with hex/rgb values we emit inline CSS.
export interface ResolvedColor {
  styles: React.CSSProperties;
  classes: string[];
}

export const resolveBackgroundColor = (
  value: ColorValue | undefined,
  theme: string = "light"
): ResolvedColor => {
  const styles: React.CSSProperties = {};
  const classes: string[] = [];
  if (!value) return { styles, classes };

  if (isGradientColor(value)) {
    const css = gradientToCss(value.gradient, theme);
    if (css) {
      styles.backgroundImage = css;
      styles.backgroundColor = "transparent";
    } else {
      classes.push(...getGradientClasses(value.gradient, theme));
    }
    return { styles, classes };
  }

  if (isThemeColor(value)) {
    const resolved = theme === "dark" ? value.dark : value.light;
    if (!resolved) return { styles, classes };
    if (isExplicitCssColor(resolved) || !resolved.includes("-")) {
      styles.backgroundColor = resolved;
    } else {
      // Tailwind color name
      classes.push(
        theme === "dark" ? `dark:bg-${resolved}` : `bg-${resolved}`
      );
    }
    return { styles, classes };
  }

  if (typeof value === "string") {
    if (isExplicitCssColor(value) || !value.includes("-")) {
      styles.backgroundColor = value;
    } else {
      classes.push(`bg-${value}`);
    }
  }

  return { styles, classes };
};

// Resolve a ColorValue to a plain CSS color string for properties like
// `color` or `borderColor`. Gradients cannot be represented here so we pick
// the `from` stop as a reasonable fallback.
export const resolveColorString = (
  value: ColorValue | undefined,
  theme: string = "light"
): string | undefined => {
  if (!value) return undefined;
  if (isGradientColor(value)) {
    const pick =
      theme === "dark" && value.gradient.dark
        ? value.gradient.dark
        : theme === "light" && value.gradient.light
          ? value.gradient.light
          : value.gradient;
    return pick.from || undefined;
  }
  if (isThemeColor(value)) {
    return theme === "dark" ? value.dark : value.light;
  }
  if (typeof value === "string") return value;
  return undefined;
};

// Optimized gradient class generator with caching
export const getGradientClasses = (
  gradientValue: GradientDefinition | undefined,
  theme: string = "light",
  prefix = ""
): string[] => {
  if (!gradientValue) return [];

  const cacheKey = `${JSON.stringify(gradientValue)}-${theme}-${prefix}`;

  if (gradientCache.has(cacheKey)) {
    return gradientCache.get(cacheKey)!;
  }

  // Get the appropriate theme version
  const currentGradient =
    theme === "dark" && gradientValue.dark
      ? gradientValue.dark
      : theme === "light" && gradientValue.light
        ? gradientValue.light
        : gradientValue;

  const direction = currentGradient.direction || "to-r";
  const from = currentGradient.from || "blue-500";
  const to = currentGradient.to || "purple-500";

  const classes = [
    `${prefix}bg-gradient-${direction}`,
    `${prefix}from-${from}`,
    currentGradient.via ? `${prefix}via-${currentGradient.via}` : "",
    `${prefix}to-${to}`,
  ].filter(Boolean);

  // Limit cache size
  if (gradientCache.size > 500) {
    const firstKey = gradientCache.keys().next().value;
    if (firstKey) {
      gradientCache.delete(firstKey);
    }
  }

  gradientCache.set(cacheKey, classes);
  return classes;
};

// React hook for optimized theme color handling
export const useThemeColor = (colorValue: ColorValue | undefined) => {
  const { theme } = useTheme();

  return useMemo(() => getThemeColor(colorValue, theme), [colorValue, theme]);
};

// React hook for optimized gradient classes
export const useGradientClasses = (
  gradientValue: GradientDefinition | undefined,
  prefix = ""
) => {
  const { theme } = useTheme();

  return useMemo(
    () => getGradientClasses(gradientValue, theme, prefix),
    [gradientValue, theme, prefix]
  );
};

// Hook for getting complete color styles with caching
export const useColorStyles = (
  backgroundColor?: ColorValue,
  color?: ColorValue,
  borderColor?: ColorValue
) => {
  const { theme } = useTheme();

  return useMemo(() => {
    const styles: Record<string, any> = {};
    const classes: string[] = [];

    // Background color
    if (backgroundColor) {
      if (isGradientColor(backgroundColor)) {
        classes.push(...getGradientClasses(backgroundColor.gradient, theme));
      } else {
        const bgColor = getThemeColor(backgroundColor, theme);
        if (bgColor) {
          styles.backgroundColor = bgColor;
        }
      }
    }

    // Text color
    const textColor = getThemeColor(color, theme);
    if (textColor) {
      styles.color = textColor;
    }

    // Border color
    const borderColorValue = getThemeColor(borderColor, theme);
    if (borderColorValue) {
      styles.borderColor = borderColorValue;
    }

    return { styles, classes };
  }, [backgroundColor, color, borderColor, theme]);
};

// Clear all color caches
export const clearColorCaches = () => {
  colorCache.clear();
  gradientCache.clear();
};

// Precompute common color values to improve performance
export const precomputeCommonColors = () => {
  const commonColors = [
    "#ffffff",
    "#000000",
    "#7c3aed",
    "#4f46e5",
    "#dc2626",
    "#059669",
    "#0891b2",
    "#ea580c",
    "#9333ea",
    "#c026d3",
  ];

  const themes = ["light", "dark"];

  commonColors.forEach((color) => {
    themes.forEach((theme) => {
      getThemeColor(color, theme);
    });
  });
};
