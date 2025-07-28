import React, { useMemo } from "react";
import {
  Star,
  Zap,
  Shield,
  Sparkles,
  Heart,
  Award,
  Check,
  ArrowRight,
  Users,
  Globe,
  Server,
} from "lucide-react";

// Icon map for faster lookups
const ICON_MAP = {
  star: Star,
  zap: Zap,
  shield: Shield,
  sparkles: Sparkles,
  heart: Heart,
  award: Award,
  check: Check,
  arrowRight: ArrowRight,
  users: Users,
  globe: Globe,
  server: Server,
} as const;

type IconName = keyof typeof ICON_MAP;

export const getIconComponent = (iconName: string) => {
  return ICON_MAP[iconName as IconName] || null;
};

// Optimized types for better performance
interface ElementSettings {
  cssId?: string;
  cssClasses?: string[];
  htmlAttributes?: Array<{ name: string; value: string }>;
  transitionProperty?: string;
  transitionCustomProperty?: string;
  transitionDuration?: number;
  transitionTimingFunction?: string;
  transitionDelay?: number;
  hoverEffect?: "elevate" | "scale" | "glow" | "tilt";
  hoverEffectIntensity?: number;
  enableAnimation?: boolean;
  animationType?: string;
  animationDuration?: number;
  animationDelay?: number;
  animationEasing?: string;
  animationIterationCount?: string | number;
  animationDirection?: string;
  animationFillMode?: string;
  position?: "static" | "relative" | "absolute" | "fixed" | "sticky";
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
  zIndex?: number;
  visibleDesktop?: boolean;
  visibleTablet?: boolean;
  visibleMobile?: boolean;
  hideOnOverflow?: boolean;
}

interface ElementWithSettings {
  settings?: ElementSettings;
}

interface AppliedSettings {
  style: React.CSSProperties;
  classes: string[];
  attributes: Record<string, string>;
}

// Cache for computed settings to avoid recalculation
const settingsCache = new Map<string, AppliedSettings>();

// Generate cache key from settings
const getCacheKey = (settings: ElementSettings): string => {
  return JSON.stringify(settings);
};

// Memoized function to apply advanced settings with caching
export function applyAdvancedSettings(
  element: ElementWithSettings,
  style: React.CSSProperties = {},
  classes: string[] = []
): AppliedSettings {
  const settings = element.settings || {};
  const cacheKey = getCacheKey(settings);

  // Check cache first
  if (settingsCache.has(cacheKey)) {
    const cached = settingsCache.get(cacheKey)!;
    return {
      style: { ...style, ...cached.style },
      classes: [...classes, ...cached.classes],
      attributes: { ...cached.attributes },
    };
  }

  const attributes: Record<string, string> = {};
  const newStyle: React.CSSProperties = { ...style };
  const newClasses: string[] = [...classes];

  // Apply CSS ID if set
  if (settings.cssId) {
    attributes.id = settings.cssId;
  }

  // Apply CSS classes if set
  if (settings.cssClasses?.length) {
    settings.cssClasses.forEach((cls) => {
      if (cls?.trim()) {
        newClasses.push(cls.trim());
      }
    });
  }

  // Apply HTML attributes if set
  if (settings.htmlAttributes?.length) {
    settings.htmlAttributes.forEach(({ name, value }) => {
      if (name?.trim()) {
        attributes[name.trim()] = value || "";
      }
    });
  }

  // Apply transitions
  if (settings.transitionProperty) {
    newStyle.transitionProperty =
      settings.transitionProperty === "custom"
        ? settings.transitionCustomProperty || settings.transitionProperty
        : settings.transitionProperty;

    if (settings.transitionDuration) {
      newStyle.transitionDuration = `${settings.transitionDuration}s`;
    }

    if (settings.transitionTimingFunction) {
      newStyle.transitionTimingFunction = settings.transitionTimingFunction;
    }

    if (settings.transitionDelay) {
      newStyle.transitionDelay = `${settings.transitionDelay}s`;
    }
  }

  // Apply hover effects
  if (settings.hoverEffect) {
    const intensity = settings.hoverEffectIntensity || 1;
    newClasses.push(`hover-${settings.hoverEffect}`);
    newStyle["--hover-intensity"] = intensity;
  }

  // Apply animations
  if (settings.enableAnimation && settings.animationType) {
    Object.assign(newStyle, {
      animationName: settings.animationType,
      animationDuration: `${settings.animationDuration || 1}s`,
      animationDelay: `${settings.animationDelay || 0}s`,
      animationTimingFunction: settings.animationEasing || "ease",
      animationIterationCount: settings.animationIterationCount || "1",
      animationDirection: settings.animationDirection || "normal",
      animationFillMode: settings.animationFillMode || "none",
    });
  }

  // Apply position settings
  if (settings.position && settings.position !== "static") {
    newStyle.position = settings.position;

    const positionProperties = [
      "top",
      "right",
      "bottom",
      "left",
      "zIndex",
    ] as const;
    positionProperties.forEach((prop) => {
      const value = settings[prop];
      if (value !== undefined) {
        newStyle[prop] = value;
      }
    });
  }

  // Apply visibility settings
  if (settings.visibleDesktop === false) {
    newClasses.push("hidden", "md:block");
  }

  if (settings.visibleTablet === false) {
    newClasses.push("hidden", "sm:block", "lg:block");
  }

  if (settings.visibleMobile === false) {
    newClasses.push("hidden", "sm:block");
  }

  if (settings.hideOnOverflow) {
    newStyle.overflow = "hidden";
  }

  const result = {
    style: newStyle,
    classes: newClasses,
    attributes,
  };

  // Cache the result (excluding the merged style from input)
  const cacheableResult = {
    style: { ...newStyle },
    classes: newClasses.filter((cls) => !classes.includes(cls)),
    attributes,
  };

  // Limit cache size to prevent memory leaks
  if (settingsCache.size > 1000) {
    const firstKey = settingsCache.keys().next().value;
    if (firstKey) {
      settingsCache.delete(firstKey);
    }
  }

  settingsCache.set(cacheKey, cacheableResult);

  return result;
}

// Memoized hook for applying advanced settings
export const useAdvancedSettings = (
  element: ElementWithSettings,
  style?: React.CSSProperties,
  classes?: string[]
) => {
  return useMemo(
    () => applyAdvancedSettings(element, style, classes),
    [element.settings, style, classes]
  );
};

// Clear cache function for when needed
export const clearSettingsCache = () => {
  settingsCache.clear();
};
