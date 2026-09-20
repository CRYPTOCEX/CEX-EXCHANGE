"use client";

import React, { memo, useMemo, useCallback, useId } from "react";
import { useTheme } from "next-themes";
import type { Element, ColorValue } from "@/types/builder";

import { getIconComponent } from "./utils";
import { cn } from "@/lib/utils";
import { withCurrentLocale } from "@/i18n/routing";
import { SafeHtml } from "../../shared/safe-html";
import {
  gradientToCss,
  isGradientColor,
  isThemeColor,
} from "./color-utils";

interface ButtonSettings {
  backgroundColor?: ColorValue;
  color?: ColorValue;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  borderRadius?: number;
  fontSize?: number;
  fontWeight?: string;
  boxShadow?: string;
  iconPosition?: "left" | "right" | "none";
  iconName?: string;
  borderWidth?: number;
  borderColor?: ColorValue;
  size?: "sm" | "md" | "lg";
  textTransform?: string;
  width?: string | number;
  htmlId?: string;
  lineHeight?: number;
  letterSpacing?: number;
  fontStyle?: string;
  textAlign?: string;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  minWidth?: string | number;
  maxWidth?: string | number;
  height?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  rotate?: number;
  scaleX?: number;
  scaleY?: number;
  translateX?: number;
  translateY?: number;
  skewX?: number;
  skewY?: number;
  position?: string;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  zIndex?: number;
  transitionProperty?: string;
  transitionCustomProperty?: string;
  transitionDuration?: number;
  transitionTimingFunction?: string;
  transitionDelay?: number;
  enableAnimation?: boolean;
  animationType?: string;
  animationDuration?: number;
  animationDelay?: number;
  animationEasing?: string;
  animationIterationCount?: string;
  animationDirection?: string;
  animationFillMode?: string;
  visibleDesktop?: boolean;
  visibleTablet?: boolean;
  visibleMobile?: boolean;
  cssClasses?: string | string[];
  hoverEffect?: string;
  link?: string;
  target?: string;
  htmlAttributes?: { name: string; value: string }[];
}

interface ButtonElementProps {
  element: Element;
  onTextChange?: (e: React.FormEvent<HTMLDivElement>) => void;
  isEditMode?: boolean;
}

// Memoized icon component
const IconComponent = memo(
  ({ iconName, className }: { iconName?: string; className?: string }) => {
    const Icon = useMemo(
      () => (iconName ? getIconComponent(iconName) : null),
      [iconName]
    );

    if (!Icon) return null;

    return <Icon className={cn("w-4 h-4", className)} />;
  }
);

IconComponent.displayName = "IconComponent";

// Main button element component
export const ButtonElement = memo<ButtonElementProps>(
  ({ element, isEditMode }) => {
    const settings = (element.settings || {}) as ButtonSettings;
    const uniqueId = useId().replace(/:/g, "-");
    const buttonId = `btn-${element.id}-${uniqueId}`;
    const { theme } = useTheme();
    const currentTheme = theme === "dark" ? "dark" : "light";

    // Size presets. These are applied as defaults; any explicit padding/font
    // settings on the button still override them below.
    const SIZE_PRESETS: Record<
      "sm" | "md" | "lg",
      {
        height: number;
        fontSize: number;
        paddingX: number;
        paddingY: number;
      }
    > = {
      sm: { height: 32, fontSize: 14, paddingX: 16, paddingY: 8 },
      md: { height: 40, fontSize: 15, paddingX: 22, paddingY: 10 },
      lg: { height: 48, fontSize: 16, paddingX: 28, paddingY: 14 },
    };
    const sizePreset = settings.size ? SIZE_PRESETS[settings.size] : undefined;

    const {
      /* Was `#7c3aed` / `#ffffff` — the old violet palette, and theme-locked.
         `ButtonElement` passes these straight into an inline style (it has no
         class branch), so a full `hsl(var(--token))` is the correct form here;
         the `[hsl(var(--token))]` fragment used elsewhere in the builder would
         land in a style attribute as a literal string and be discarded. */
      backgroundColor = "hsl(var(--primary))",
      color = "hsl(var(--primary-foreground))",
      paddingTop = sizePreset?.paddingY ?? 12,
      paddingRight = sizePreset?.paddingX ?? 24,
      paddingBottom = sizePreset?.paddingY ?? 12,
      paddingLeft = sizePreset?.paddingX ?? 24,
      borderRadius = 8,
      fontSize = sizePreset?.fontSize ?? 16,
      fontWeight = "600",
      boxShadow = "none",
      iconPosition = "none",
      iconName = "arrowRight",
      borderWidth = 0,
      borderColor = "transparent",
      textTransform = "none",
      width = "auto",
      htmlId,
    } = settings;

    // Resolve a ColorValue intended for backgroundColor. Gradients with
    // explicit hex/rgb stops become `background-image: linear-gradient(...)`
    // with `backgroundColor: transparent`. Theme objects pick the current
    // theme's string value. Plain strings pass through.
    const resolveBg = (
      value: ColorValue | undefined
    ): { backgroundColor?: string; backgroundImage?: string } => {
      if (value === undefined || value === null) return {};
      if (typeof value === "string") return { backgroundColor: value };
      if (isGradientColor(value)) {
        const css = gradientToCss(value.gradient, currentTheme);
        if (css) {
          return { backgroundImage: css, backgroundColor: "transparent" };
        }
        // Gradient with Tailwind color-name stops is not representable as a
        // single CSS color; fall back to the `from` stop so the button still
        // has a solid fill rather than rendering invisible.
        const pick =
          currentTheme === "dark" && value.gradient.dark
            ? value.gradient.dark
            : currentTheme === "light" && value.gradient.light
              ? value.gradient.light
              : value.gradient;
        return pick.from ? { backgroundColor: pick.from } : {};
      }
      if (isThemeColor(value)) {
        const picked =
          currentTheme === "dark" ? value.dark : value.light;
        return picked ? { backgroundColor: picked } : {};
      }
      return {};
    };

    // Resolve a ColorValue intended for a plain CSS color string (for `color`
    // and `borderColor`). Gradients aren't representable here — pick the
    // `from` stop as a sensible fallback.
    const resolveColorStr = (
      value: ColorValue | undefined
    ): string | undefined => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === "string") return value;
      if (isGradientColor(value)) {
        const pick =
          currentTheme === "dark" && value.gradient.dark
            ? value.gradient.dark
            : currentTheme === "light" && value.gradient.light
              ? value.gradient.light
              : value.gradient;
        return pick.from || undefined;
      }
      if (isThemeColor(value)) {
        return currentTheme === "dark" ? value.dark : value.light;
      }
      return undefined;
    };

    const buttonStyles = useMemo((): React.CSSProperties => {
      const bg = resolveBg(backgroundColor);
      const resolvedTextColor = resolveColorStr(color);
      const resolvedBorderColor = resolveColorStr(borderColor);

      const style: React.CSSProperties = {
        ...bg,
        color: resolvedTextColor,
        paddingTop: `${paddingTop}px`,
        paddingRight: `${paddingRight}px`,
        paddingBottom: `${paddingBottom}px`,
        paddingLeft: `${paddingLeft}px`,
        borderRadius: `${borderRadius}px`,
        fontSize: `${fontSize}px`,
        fontWeight,
        boxShadow: boxShadow !== "none" ? boxShadow : undefined,
        borderWidth: borderWidth > 0 ? `${borderWidth}px` : undefined,
        borderStyle: borderWidth > 0 ? "solid" : undefined,
        borderColor: borderWidth > 0 ? resolvedBorderColor : undefined,
        textTransform: textTransform as React.CSSProperties["textTransform"],
        width: typeof width === "number" ? `${width}px` : width,
        transition: "all 0.2s ease-in-out",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        outline: "none",
        userSelect: "none" as const,
      };

      // Apply size preset height when no explicit height is given.
      if (sizePreset && settings.height === undefined) {
        style.height = `${sizePreset.height}px`;
      }

      // Apply additional design settings from design tab
      if (settings.lineHeight) style.lineHeight = settings.lineHeight;
      if (settings.letterSpacing)
        style.letterSpacing = `${settings.letterSpacing}px`;
      if (settings.fontStyle) style.fontStyle = settings.fontStyle;
      if (settings.textAlign)
        style.textAlign =
          settings.textAlign as React.CSSProperties["textAlign"];

      // Apply margins (for positioning)
      if (settings.marginTop !== undefined)
        style.marginTop = `${settings.marginTop}px`;
      if (settings.marginRight !== undefined)
        style.marginRight = `${settings.marginRight}px`;
      if (settings.marginBottom !== undefined)
        style.marginBottom = `${settings.marginBottom}px`;
      if (settings.marginLeft !== undefined)
        style.marginLeft = `${settings.marginLeft}px`;

      // Apply sizing settings
      if (settings.minWidth)
        style.minWidth =
          typeof settings.minWidth === "number"
            ? `${settings.minWidth}px`
            : settings.minWidth;
      if (settings.maxWidth)
        style.maxWidth =
          typeof settings.maxWidth === "number"
            ? `${settings.maxWidth}px`
            : settings.maxWidth;
      if (settings.height)
        style.height =
          typeof settings.height === "number"
            ? `${settings.height}px`
            : settings.height;
      if (settings.minHeight)
        style.minHeight =
          typeof settings.minHeight === "number"
            ? `${settings.minHeight}px`
            : settings.minHeight;
      if (settings.maxHeight)
        style.maxHeight =
          typeof settings.maxHeight === "number"
            ? `${settings.maxHeight}px`
            : settings.maxHeight;

      // Apply transform settings
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

      // Apply position settings from advanced tab
      if (settings.position && settings.position !== "static") {
        style.position = settings.position as React.CSSProperties["position"];
        if (settings.top !== undefined) style.top = settings.top;
        if (settings.right !== undefined) style.right = settings.right;
        if (settings.bottom !== undefined) style.bottom = settings.bottom;
        if (settings.left !== undefined) style.left = settings.left;
        if (settings.zIndex !== undefined) style.zIndex = settings.zIndex;
      }

      // Apply transition settings
      if (settings.transitionProperty) {
        style.transitionProperty =
          settings.transitionProperty === "custom"
            ? settings.transitionCustomProperty || settings.transitionProperty
            : settings.transitionProperty;

        if (settings.transitionDuration)
          style.transitionDuration = `${settings.transitionDuration}s`;
        if (settings.transitionTimingFunction)
          style.transitionTimingFunction = settings.transitionTimingFunction;
        if (settings.transitionDelay)
          style.transitionDelay = `${settings.transitionDelay}s`;
      }

      // Apply animation settings
      if (settings.enableAnimation && settings.animationType) {
        style.animationName = settings.animationType;
        style.animationDuration = `${settings.animationDuration || 1}s`;
        style.animationDelay = `${settings.animationDelay || 0}s`;
        style.animationTimingFunction = settings.animationEasing || "ease";
        style.animationIterationCount = settings.animationIterationCount || "1";
        style.animationDirection = settings.animationDirection || "normal";
        style.animationFillMode = settings.animationFillMode || "none";
      }

      return style;
    }, [
      backgroundColor,
      color,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      borderRadius,
      fontSize,
      fontWeight,
      boxShadow,
      borderWidth,
      borderColor,
      textTransform,
      width,
      settings,
      currentTheme,
      sizePreset,
    ]);

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (isEditMode) {
          // Block link navigation only. Do NOT stopPropagation — the outer
          // Element wrapper listens for clicks on the element box to open
          // the settings panel for this button. Swallowing the event here
          // made the button impossible to select in the builder.
          e.preventDefault();
        } else {
          // Handle link navigation in preview mode
          if (settings.link) {
            const target = settings.target || "_self";
            const href = settings.link.startsWith("/")
              ? withCurrentLocale(settings.link)
              : settings.link;
            if (target === "_blank") {
              window.open(href, "_blank", "noopener,noreferrer");
            } else {
              window.location.href = href;
            }
          }
        }
      },
      [isEditMode, settings.link, settings.target]
    );

    const buttonContent = useMemo(() => {
      const hasLeftIcon = iconPosition === "left" && iconName;
      const hasRightIcon = iconPosition === "right" && iconName;

      return (
        <>
          {hasLeftIcon && (
            <IconComponent iconName={iconName} className="mr-1" />
          )}

          <SafeHtml tag="span" html={element.content || "Button"} />

          {hasRightIcon && (
            <IconComponent iconName={iconName} className="ml-1" />
          )}
        </>
      );
    }, [iconPosition, iconName, element.content]);

    const additionalClasses = useMemo(() => {
      const classes: string[] = [];

      // Add visibility classes
      if (settings.visibleDesktop === false) classes.push("hidden md:block");
      if (settings.visibleTablet === false)
        classes.push("hidden sm:block lg:block");
      if (settings.visibleMobile === false) classes.push("hidden sm:block");

      // Add custom CSS classes (supports both string[] legacy and space-separated string)
      const rawClasses = Array.isArray(settings.cssClasses)
        ? settings.cssClasses
        : typeof settings.cssClasses === "string"
          ? settings.cssClasses.split(/\s+/)
          : [];
      rawClasses.forEach((cls: string) => {
        if (cls?.trim()) classes.push(cls.trim());
      });

      // Add hover effect classes
      if (settings.hoverEffect) {
        classes.push(`hover-${settings.hoverEffect}`);
      }

      return classes.join(" ");
    }, [settings]);

    const elementProps = useMemo(
      () => ({
        id: htmlId || buttonId,
        className: cn(
          "button-element",
          "focus:ring-2",
          "focus:ring-offset-2",
          "focus:ring-primary",
          additionalClasses
        ),
        style: buttonStyles,
        onClick: handleClick,
        "data-element-id": element.id,
        "data-element-type": "button",
        // Add HTML attributes from advanced tab
        ...(settings.htmlAttributes
          ? Object.fromEntries(
              settings.htmlAttributes.map(
                (attr: { name: string; value: string }) => [
                  attr.name,
                  attr.value,
                ]
              )
            )
          : {}),
      }),
      [
        htmlId,
        buttonId,
        buttonStyles,
        handleClick,
        element.id,
        additionalClasses,
        settings.htmlAttributes,
      ]
    );

    if (isEditMode) {
      return (
        <div {...elementProps} role="button" tabIndex={-1}>
          {buttonContent}
        </div>
      );
    }

    return <button {...elementProps}>{buttonContent}</button>;
  }
);

ButtonElement.displayName = "ButtonElement";
