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
