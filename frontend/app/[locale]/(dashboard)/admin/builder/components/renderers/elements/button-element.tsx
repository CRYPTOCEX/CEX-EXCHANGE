"use client";

import React, { memo, useMemo, useCallback, useId } from "react";
import type { Element } from "@/types/builder";

import { getIconComponent } from "./utils";
import { cn } from "@/lib/utils";

interface ButtonSettings {
  backgroundColor?: string;
  color?: string;
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
  borderColor?: string;
  textTransform?: string;
  width?: string | number;
  cssId?: string;
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
  cssClasses?: string[];
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

    const {
      backgroundColor = "#7c3aed",
      color = "#ffffff",
      paddingTop = 12,
      paddingRight = 24,
      paddingBottom = 12,
      paddingLeft = 24,
      borderRadius = 8,
      fontSize = 16,
      fontWeight = "600",
      boxShadow = "none",
      iconPosition = "none",
      iconName = "arrowRight",
      borderWidth = 0,
      borderColor = "transparent",
      textTransform = "none",
      width = "auto",
      cssId,
    } = settings;

    const buttonStyles = useMemo((): React.CSSProperties => {
      const style: React.CSSProperties = {
        backgroundColor,
        color,
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
        borderColor: borderWidth > 0 ? borderColor : undefined,
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
    ]);

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (isEditMode) {
          e.preventDefault();
          e.stopPropagation();
        } else {
          // Handle link navigation in preview mode
          if (settings.link) {
            const target = settings.target || "_self";
            if (target === "_blank") {
              window.open(settings.link, "_blank");
            } else {
              window.location.href = settings.link;
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

          <span 
            dangerouslySetInnerHTML={{ __html: element.content || "Button" }}
          />

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

      // Add custom CSS classes
      if (settings.cssClasses?.length) {
        settings.cssClasses.forEach((cls: string) => {
          if (cls?.trim()) classes.push(cls.trim());
        });
      }

      // Add hover effect classes
      if (settings.hoverEffect) {
        classes.push(`hover-${settings.hoverEffect}`);
      }

      return classes.join(" ");
    }, [settings]);

    const elementProps = useMemo(
      () => ({
        id: cssId || buttonId,
        className: cn(
          "button-element",
          "focus:ring-2",
          "focus:ring-offset-2",
          "focus:ring-blue-500",
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
        cssId,
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
