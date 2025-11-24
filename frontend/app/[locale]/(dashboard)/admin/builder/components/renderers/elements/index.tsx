"use client";

import type React from "react";
import { useMemo, useCallback } from "react";
import type { Element } from "@/types/builder";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/store/builder-store";
import { ResizableBase } from "../../canvas/resizable";

// Import all element components
import {
  HeadingElement,
  TextElement,
  ListElement,
  QuoteElement,
  IconElementComponent,
  LinkElement,
} from "./text-elements";
import { ButtonElement } from "./button-element";
import {
  ImageElementComponent,
  GalleryElementComponent,
} from "./media-elements";
import {
  SpacerElement,
  DividerElement,
  ContainerElement,
  ColumnsElement,
} from "./layout-elements";
import {
  CardElement,
  PricingElement,
  CtaElement,
  NotificationElement,
  FeatureElement,
} from "./content-elements";
import { TestimonialElement, StatsElement } from "./social-elements";
import { AnimatedImageGridElement } from "./animated-image-grid";
import { TrendingMarketsElement } from "./trending-markets";
import { renderElement as renderPreviewElement } from "./preview-renderer";

// Import the applyAdvancedSettings function at the top of the file
import { applyAdvancedSettings } from "./utils";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

// Re-export all elements for use elsewhere
export {
  HeadingElement,
  TextElement,
  ButtonElement,
  ImageElementComponent,
  GalleryElementComponent,
  IconElementComponent,
  SpacerElement,
  DividerElement,
  ContainerElement,
  ColumnsElement,
  CardElement,
  PricingElement,
  CtaElement,
  NotificationElement,
  FeatureElement,
  TestimonialElement,
  StatsElement,
  ListElement,
  QuoteElement,
  AnimatedImageGridElement,
  LinkElement,
  TrendingMarketsElement,
};

// Define proper types for color objects
interface ThemeColor {
  light?: string;
  dark?: string;
  type?: never; // Ensure this doesn't have a type property
}

interface GradientDefinition {
  direction?: string;
  from?: string;
  via?: string;
  to?: string;
  dark?: GradientDefinition;
  light?: GradientDefinition;
}

interface GradientColor {
  type: "gradient";
  gradient: GradientDefinition;
}

type ColorValue = string | ThemeColor | GradientColor;

// Type guard for GradientColor
const isGradientColor = (color: any): color is GradientColor => {
  return (
    typeof color === "object" &&
    color !== null &&
    "type" in color &&
    color.type === "gradient"
  );
};

// Type guard for ThemeColor
const isThemeColor = (color: any): color is ThemeColor => {
  return typeof color === "object" && color !== null && !("type" in color);
};

// Define element settings interface
interface ElementSettings {
  backgroundColor?: ColorValue;
  color?: ColorValue;
  hoverColor?: ColorValue;
  hoverBackgroundColor?: ColorValue;
  hoverBorderColor?: ColorValue;
  borderWidth?: number;
  [key: string]: any; // Allow other properties
}

// Export the renderElement function
export function renderElement(element: Element) {
  // Use the preview renderer for now
  return renderPreviewElement(element);
}

interface ElementRendererProps {
  element: Element;
  isEditMode: boolean;
}

// Enhanced function to apply all settings from all tabs
const getComprehensiveElementStyle = (
  element: Element,
  settings: ElementSettings
): React.CSSProperties => {
  // Safety check for null/undefined inputs
  if (!element || !settings || typeof settings !== "object") {
    return {};
  }

  const style: React.CSSProperties = {};

  // ========== DESIGN TAB SETTINGS ==========

  // Typography settings
  if (settings.fontSize) {
    style.fontSize = `${settings.fontSize}px`;
  }
  if (settings.fontWeight) {
    style.fontWeight = settings.fontWeight;
  }
  if (settings.lineHeight) {
    style.lineHeight = settings.lineHeight;
  }
  if (settings.letterSpacing) {
    style.letterSpacing = `${settings.letterSpacing}px`;
  }
  if (settings.textTransform) {
    style.textTransform = settings.textTransform as any;
  }
  if (settings.fontStyle) {
    style.fontStyle = settings.fontStyle;
  }
  if (settings.textAlign) {
    style.textAlign = settings.textAlign as any;
  }

  // Background and colors (handled by getThemeClasses but also need inline styles for complex values)
  if (
    settings.backgroundColor &&
    typeof settings.backgroundColor === "string" &&
    !settings.backgroundColor.includes("-")
  ) {
    style.backgroundColor = settings.backgroundColor;
  }
  if (
    settings.color &&
    typeof settings.color === "string" &&
    !settings.color.includes("-")
  ) {
    style.color = settings.color;
  }

  // Spacing settings - only apply if explicitly set
  if (settings.paddingTop !== undefined)
    style.paddingTop = `${settings.paddingTop}px`;
  if (settings.paddingRight !== undefined)
    style.paddingRight = `${settings.paddingRight}px`;
  if (settings.paddingBottom !== undefined)
    style.paddingBottom = `${settings.paddingBottom}px`;
  if (settings.paddingLeft !== undefined)
    style.paddingLeft = `${settings.paddingLeft}px`;

  if (settings.marginTop !== undefined)
    style.marginTop = `${settings.marginTop}px`;
  if (settings.marginRight !== undefined)
    style.marginRight = `${settings.marginRight}px`;
  if (settings.marginBottom !== undefined)
    style.marginBottom = `${settings.marginBottom}px`;
  if (settings.marginLeft !== undefined)
    style.marginLeft = `${settings.marginLeft}px`;

  // Border settings
  if (settings.borderWidth) {
    style.borderWidth = `${settings.borderWidth}px`;
    style.borderStyle = settings.borderStyle || "solid";
  }
  if (settings.borderRadius) {
    style.borderRadius = `${settings.borderRadius}px`;
  }
  if (
    settings.borderColor &&
    typeof settings.borderColor === "string" &&
    !settings.borderColor.includes("-")
  ) {
    style.borderColor = settings.borderColor;
  }

  // Box shadow settings
  if (
    settings.boxShadowX !== undefined ||
    settings.boxShadowY !== undefined ||
    settings.boxShadowBlur !== undefined
  ) {
    const x = settings.boxShadowX || 0;
    const y = settings.boxShadowY || 0;
    const blur = settings.boxShadowBlur || 0;
    const spread = settings.boxShadowSpread || 0;
    const color = settings.boxShadowColor || "rgba(0,0,0,0.1)";
    const inset = settings.boxShadowInset ? "inset " : "";

    style.boxShadow = `${inset}${x}px ${y}px ${blur}px ${spread}px ${typeof color === "string" ? color : "rgba(0,0,0,0.1)"}`;
  }

  // Transform settings (from design tab)
  if (
    settings.rotate ||
    settings.scaleX ||
    settings.scaleY ||
    settings.translateX ||
    settings.translateY ||
    settings.skewX ||
    settings.skewY
  ) {
    const transforms: string[] = [];
    if (settings.rotate) transforms.push(`rotate(${settings.rotate}deg)`);
    if (settings.scaleX) transforms.push(`scaleX(${settings.scaleX})`);
    if (settings.scaleY) transforms.push(`scaleY(${settings.scaleY})`);
    if (settings.translateX)
      transforms.push(`translateX(${settings.translateX}px)`);
    if (settings.translateY)
      transforms.push(`translateY(${settings.translateY}px)`);
    if (settings.skewX) transforms.push(`skewX(${settings.skewX}deg)`);
    if (settings.skewY) transforms.push(`skewY(${settings.skewY}deg)`);

    if (transforms.length > 0) {
      style.transform = transforms.join(" ");
    }
  }

  // Filter settings (for media elements)
  if (
    settings.blur ||
    settings.brightness ||
    settings.contrast ||
    settings.saturate ||
    settings.hueRotate
  ) {
    const filters: string[] = [];
    if (settings.blur) filters.push(`blur(${settings.blur}px)`);
    if (settings.brightness)
      filters.push(`brightness(${settings.brightness}%)`);
    if (settings.contrast) filters.push(`contrast(${settings.contrast}%)`);
    if (settings.saturate) filters.push(`saturate(${settings.saturate}%)`);
    if (settings.hueRotate)
      filters.push(`hue-rotate(${settings.hueRotate}deg)`);

    if (filters.length > 0) {
      style.filter = filters.join(" ");
    }
  }

  // Sizing settings
  if (settings.width) {
    style.width =
      typeof settings.width === "number"
        ? `${settings.width}px`
        : settings.width;
  }
  if (settings.height) {
    style.height =
      typeof settings.height === "number"
        ? `${settings.height}px`
        : settings.height;
  }
  if (settings.minWidth) {
    style.minWidth =
      typeof settings.minWidth === "number"
        ? `${settings.minWidth}px`
        : settings.minWidth;
  }
  if (settings.minHeight) {
    style.minHeight =
      typeof settings.minHeight === "number"
        ? `${settings.minHeight}px`
        : settings.minHeight;
  }
  if (settings.maxWidth) {
    style.maxWidth =
      typeof settings.maxWidth === "number"
        ? `${settings.maxWidth}px`
        : settings.maxWidth;
  }
  if (settings.maxHeight) {
    style.maxHeight =
      typeof settings.maxHeight === "number"
        ? `${settings.maxHeight}px`
        : settings.maxHeight;
  }

  // ========== ADVANCED TAB SETTINGS ==========

  // Position settings
  if (settings.position && settings.position !== "static") {
    style.position = settings.position;

    if (settings.top !== undefined) style.top = settings.top;
    if (settings.right !== undefined) style.right = settings.right;
    if (settings.bottom !== undefined) style.bottom = settings.bottom;
    if (settings.left !== undefined) style.left = settings.left;
    if (settings.zIndex !== undefined) style.zIndex = settings.zIndex;
  }

  // Transform origin
  if (settings.transformOrigin) {
    style.transformOrigin = settings.transformOrigin;
  }

  // Transitions
  if (settings.transitionProperty) {
    style.transitionProperty =
      settings.transitionProperty === "custom"
        ? settings.transitionCustomProperty || settings.transitionProperty
        : settings.transitionProperty;

    if (settings.transitionDuration) {
      style.transitionDuration = `${settings.transitionDuration}s`;
    }
    if (settings.transitionTimingFunction) {
      style.transitionTimingFunction = settings.transitionTimingFunction;
    }
    if (settings.transitionDelay) {
      style.transitionDelay = `${settings.transitionDelay}s`;
    }
  }

  // Animations
  if (settings.enableAnimation && settings.animationType) {
    style.animationName = settings.animationType;
    style.animationDuration = `${settings.animationDuration || 1}s`;
    style.animationDelay = `${settings.animationDelay || 0}s`;
    style.animationTimingFunction = settings.animationEasing || "ease";
    style.animationIterationCount = settings.animationIterationCount || "1";
    style.animationDirection = settings.animationDirection || "normal";
    style.animationFillMode = settings.animationFillMode || "none";
  }

  // Overflow handling
  if (settings.hideOnOverflow) {
    style.overflow = "hidden";
  }

  // ========== CONTENT TAB SETTINGS ==========
  // Content settings are mostly handled by individual components
  // but we can apply some common ones here

  // Image-specific content settings
  if (element.type === "image") {
    if (settings.objectFit) {
      style.objectFit = settings.objectFit as any;
    }
    if (settings.objectPosition) {
      style.objectPosition = settings.objectPosition;
    }
    if (settings.aspectRatio) {
      style.aspectRatio = settings.aspectRatio.toString();
    }
  }

  return style;
};

// Enhanced function to get comprehensive CSS classes
const getComprehensiveClasses = (
  element: Element,
  settings: ElementSettings,
  theme: string,
  getGradientClasses: (gradient: any, prefix?: string) => string[]
): string[] => {
  // Safety check for null/undefined inputs
  if (!element || !settings || typeof settings !== "object") {
    return [];
  }

  const classes: string[] = [];

  // Base element classes
  classes.push("element-wrapper", "relative");

  // ========== DESIGN TAB CLASSES ==========

  // Background color classes (Tailwind)
  if (settings.backgroundColor) {
    if (isGradientColor(settings.backgroundColor)) {
      classes.push(...getGradientClasses(settings.backgroundColor.gradient));
    } else if (isThemeColor(settings.backgroundColor)) {
      if (theme === "light" && settings.backgroundColor.light?.includes("-")) {
        classes.push(`bg-${settings.backgroundColor.light}`);
      }
      if (theme === "dark" && settings.backgroundColor.dark?.includes("-")) {
        classes.push(`dark:bg-${settings.backgroundColor.dark}`);
      }
    } else if (
      typeof settings.backgroundColor === "string" &&
      settings.backgroundColor.includes("-")
    ) {
      classes.push(`bg-${settings.backgroundColor}`);
    }
  }

  // Text color classes
  if (settings.color) {
    if (isGradientColor(settings.color)) {
      classes.push("text-transparent bg-clip-text");
      classes.push(...getGradientClasses(settings.color.gradient));
    } else if (isThemeColor(settings.color)) {
      if (theme === "light" && settings.color.light?.includes("-")) {
        classes.push(`text-${settings.color.light}`);
      }
      if (theme === "dark" && settings.color.dark?.includes("-")) {
        classes.push(`dark:text-${settings.color.dark}`);
      }
    } else if (
      typeof settings.color === "string" &&
      settings.color.includes("-")
    ) {
      classes.push(`text-${settings.color}`);
    }
  }

  // Hover effects classes
  if (settings.hoverBackgroundColor) {
    if (isGradientColor(settings.hoverBackgroundColor)) {
      const hoverGradientClasses = getGradientClasses(
        settings.hoverBackgroundColor.gradient,
        "hover:"
      );
      classes.push(...hoverGradientClasses);
    } else if (isThemeColor(settings.hoverBackgroundColor)) {
      if (
        theme === "light" &&
        settings.hoverBackgroundColor.light?.includes("-")
      ) {
        classes.push(`hover:bg-${settings.hoverBackgroundColor.light}`);
      }
      if (
        theme === "dark" &&
        settings.hoverBackgroundColor.dark?.includes("-")
      ) {
        classes.push(`hover:dark:bg-${settings.hoverBackgroundColor.dark}`);
      }
    } else if (
      typeof settings.hoverBackgroundColor === "string" &&
      settings.hoverBackgroundColor.includes("-")
    ) {
      classes.push(`hover:bg-${settings.hoverBackgroundColor}`);
    }
  }

  if (settings.hoverColor) {
    if (isGradientColor(settings.hoverColor)) {
      classes.push("hover:text-transparent hover:bg-clip-text");
      const hoverGradientClasses = getGradientClasses(
        settings.hoverColor.gradient,
        "hover:"
      );
      classes.push(...hoverGradientClasses);
    } else if (isThemeColor(settings.hoverColor)) {
      if (theme === "light" && settings.hoverColor.light?.includes("-")) {
        classes.push(`hover:text-${settings.hoverColor.light}`);
      }
      if (theme === "dark" && settings.hoverColor.dark?.includes("-")) {
        classes.push(`hover:dark:text-${settings.hoverColor.dark}`);
      }
    } else if (
      typeof settings.hoverColor === "string" &&
      settings.hoverColor.includes("-")
    ) {
      classes.push(`hover:text-${settings.hoverColor}`);
    }
  }

  // Transition classes for hover effects
  if (
    settings.hoverBackgroundColor ||
    settings.hoverColor ||
    settings.hoverBorderColor ||
    settings.transitionProperty
  ) {
    classes.push("transition-all duration-300");
  }

  // ========== ADVANCED TAB CLASSES ==========

  // Visibility classes
  if (settings.visibleDesktop === false) {
    classes.push("hidden", "md:block");
  }
  if (settings.visibleTablet === false) {
    classes.push("hidden", "sm:block", "lg:block");
  }
  if (settings.visibleMobile === false) {
    classes.push("hidden", "sm:block");
  }

  // Custom CSS classes
  if (settings.cssClasses?.length) {
    settings.cssClasses.forEach((cls: string) => {
      if (cls?.trim()) {
        classes.push(cls.trim());
      }
    });
  }

  // Hover effect classes
  if (settings.hoverEffect) {
    classes.push(`hover-${settings.hoverEffect}`);
  }

  return classes;
};

export default function ElementRenderer({
  element,
  isEditMode,
}: ElementRendererProps) {
  const t = useTranslations("dashboard");
  const { theme } = useTheme();
  const { updateElement } = useBuilderStore();

  // Early validation to prevent null/undefined errors
  if (!element || typeof element !== "object") {
    console.warn("ElementRenderer: Invalid element provided:", element);
    return (
      <div className="p-2 text-center text-red-500">{t("invalid_element")}</div>
    );
  }

  if (!element.type) {
    console.warn("ElementRenderer: Element missing type:", element);
    return (
      <div className="p-2 text-center text-yellow-600">
        {t("element_missing_type")}
      </div>
    );
  }

  if (!element.id) {
    console.warn("ElementRenderer: Element missing id:", element);
    return (
      <div className="p-2 text-center text-yellow-600">
        {t("element_missing_id")}
      </div>
    );
  }

  const getThemeColor = (
    colorValue: ColorValue | undefined
  ): string | undefined => {
    if (!colorValue) return undefined;

    // If it's a theme object with light/dark values
    if (isThemeColor(colorValue) && colorValue.light && colorValue.dark) {
      return theme === "dark" ? colorValue.dark : colorValue.light;
    }

    // Otherwise return the color as is
    return typeof colorValue === "string" ? colorValue : undefined;
  };

  const getGradientClasses = (
    gradientValue: GradientDefinition | undefined,
    prefix = ""
  ): string[] => {
    if (!gradientValue) return [];

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
    ];

    return classes.filter(Boolean);
  };



  const renderElement = useMemo(() => {
    try {
      switch (element.type) {
        case "heading":
          return (
            <HeadingElement
              element={element}
              comprehensiveStyle={getComprehensiveElementStyle(element, (element.settings as ElementSettings) || {})}
              comprehensiveClasses={getComprehensiveClasses(element, (element.settings as ElementSettings) || {}, theme || "light", getGradientClasses)}
            />
          );
        case "text":
          return (
            <TextElement
              element={element}
              comprehensiveStyle={getComprehensiveElementStyle(element, (element.settings as ElementSettings) || {})}
              comprehensiveClasses={getComprehensiveClasses(element, (element.settings as ElementSettings) || {}, theme || "light", getGradientClasses)}
            />
          );
        case "button":
          return (
            <ButtonElement
              element={element}
              isEditMode={isEditMode}
            />
          );
        case "image":
          return <ImageElementComponent element={element} />;
        case "divider":
          return <DividerElement element={element} />;
        case "spacer":
          return <SpacerElement element={element} />;
        case "icon":
          return (
            <IconElementComponent
              element={element}
            />
          );
        case "columns":
          return <ColumnsElement element={element} />;
        case "container":
          return <ContainerElement element={element} />;
        case "card":
          return <CardElement element={element} />;
        case "pricing":
          return <PricingElement element={element} />;
        case "testimonial":
          return <TestimonialElement element={element} />;
        case "stats":
          return <StatsElement element={element} />;
        case "cta":
          return <CtaElement element={element} />;
        case "notification":
          return <NotificationElement element={element} />;
        case "feature":
          return <FeatureElement element={element} />;
        case "animatedImageGrid":
          return <AnimatedImageGridElement element={element} />;
        case "link":
          return (
            <LinkElement
              element={element}
              comprehensiveStyle={getComprehensiveElementStyle(element, (element.settings as ElementSettings) || {})}
              comprehensiveClasses={getComprehensiveClasses(element, (element.settings as ElementSettings) || {}, theme || "light", getGradientClasses)}
            />
          );
        case "trendingMarkets":
          return <TrendingMarketsElement element={element} />;
        default:
          return (
            <div>
              {t("unknown_element_type")}
              {element.type}
            </div>
          );
      }
    } catch (error) {
      console.error(
        "ElementRenderer: Error rendering element:",
        error,
        element
      );
      return (
        <div className="p-2 text-center text-red-500">
          {t("error_rendering_element")}
        </div>
      );
    }
  }, [element, isEditMode]);

  try {
    const settings = (element.settings as ElementSettings) || {};

    // Get comprehensive styles and classes
    const comprehensiveStyle = getComprehensiveElementStyle(element, settings);
    const comprehensiveClasses = getComprehensiveClasses(
      element,
      settings,
      theme || "light",
      getGradientClasses
    );

    // For these elements, return directly to avoid double wrapping since they handle their own styling
    if (["button", "heading", "text", "link"].includes(element.type)) {
      return renderElement;
    }

    // Get advanced settings
    const {
      style: advancedStyle,
      classes: advancedClasses,
      attributes: advancedAttributes,
    } = applyAdvancedSettings(
      element as any,
      comprehensiveStyle,
      comprehensiveClasses
    );

    // Merge all styles
    const finalStyle = { ...comprehensiveStyle, ...advancedStyle };

    // Merge all classes
    const finalClasses = [...comprehensiveClasses, ...advancedClasses];

    // Common element wrapper with comprehensive settings applied
    const elementWrapper = (
      <div
        id={settings.cssId}
        className={cn(...finalClasses)}
        style={finalStyle}
        {...advancedAttributes}
      >
        {renderElement}
      </div>
    );

    // Always use ResizableBase for consistent DOM structure
    return (
      <ResizableBase
        id={element.id}
        isSelected={false}
        onSelect={() => {}}
        settings={element.settings || {}}
        updateSettings={(key, value) => {
          updateElement(element.id, {
            ...element,
            settings: { ...element.settings, [key]: value },
          });
        }}
        isEditMode={isEditMode}
      >
        {() => elementWrapper}
      </ResizableBase>
    );
  } catch (error) {
    console.error("ElementRenderer: Error in final rendering:", error, element);
    return (
      <div className="p-2 text-center text-red-500">
        {t("error_rendering_element_wrapper")}
      </div>
    );
  }
}
