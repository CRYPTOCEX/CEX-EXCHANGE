"use client";

import React, { memo, useMemo } from "react";
import type { Element } from "@/types/builder";

import { getIconComponent } from "./utils";
import { cn } from "@/lib/utils";
import type { JSX } from "react/jsx-runtime";
import { useTranslations } from "next-intl";

// Helper function to get text alignment class
function getTextAlignClass(textAlign: string) {
  switch (textAlign) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    case "justify":
      return "text-justify";
    default:
      return "text-left";
  }
}

// Helper function to apply comprehensive design settings
function getComprehensiveStyles(
  settings: Record<string, any>
): React.CSSProperties {
  const style: React.CSSProperties = {};

  // Typography settings
  if (settings.fontSize) style.fontSize = `${settings.fontSize}px`;
  if (settings.fontWeight) style.fontWeight = settings.fontWeight;
  if (settings.lineHeight) style.lineHeight = settings.lineHeight;
  else style.lineHeight = "1.5"; // Default line height to prevent thin lines
  if (settings.letterSpacing)
    style.letterSpacing = `${settings.letterSpacing}px`;
  if (settings.textTransform) style.textTransform = settings.textTransform;
  if (settings.fontStyle) style.fontStyle = settings.fontStyle;
  if (settings.textAlign) style.textAlign = settings.textAlign;

  // Colors (if not using Tailwind classes)
  if (
    settings.color &&
    typeof settings.color === "string" &&
    !settings.color.includes("-")
  ) {
    style.color = settings.color;
  }
  if (
    settings.backgroundColor &&
    typeof settings.backgroundColor === "string" &&
    !settings.backgroundColor.includes("-")
  ) {
    style.backgroundColor = settings.backgroundColor;
  }

  // Spacing - only apply if explicitly set (including 0)
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

  // Borders
  if (settings.borderWidth) {
    style.borderWidth = `${settings.borderWidth}px`;
    style.borderStyle = settings.borderStyle || "solid";
  }
  if (settings.borderRadius) style.borderRadius = `${settings.borderRadius}px`;
  if (
    settings.borderColor &&
    typeof settings.borderColor === "string" &&
    !settings.borderColor.includes("-")
  ) {
    style.borderColor = settings.borderColor;
  }

  // Box shadow
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

  // Sizing
  if (settings.width)
    style.width =
      typeof settings.width === "number"
        ? `${settings.width}px`
        : settings.width;
  if (settings.height)
    style.height =
      typeof settings.height === "number"
        ? `${settings.height}px`
        : settings.height;
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
  
  // Ensure minimum height for text elements to prevent thin line appearance
  if (!style.height && !settings.height) {
    style.minHeight = "1.2em";
  }

  // Transform
  if (
    settings.rotate ||
    settings.scaleX ||
    settings.scaleY ||
    settings.translateX ||
    settings.translateY
  ) {
    const transforms: string[] = [];
    if (settings.rotate) transforms.push(`rotate(${settings.rotate}deg)`);
    if (settings.scaleX) transforms.push(`scaleX(${settings.scaleX})`);
    if (settings.scaleY) transforms.push(`scaleY(${settings.scaleY})`);
    if (settings.translateX)
      transforms.push(`translateX(${settings.translateX}px)`);
    if (settings.translateY)
      transforms.push(`translateY(${settings.translateY}px)`);

    if (transforms.length > 0) style.transform = transforms.join(" ");
  }

  return style;
}

// Helper function to get comprehensive classes
function getComprehensiveClasses(settings: Record<string, any>): string {
  const classes: string[] = [];

  // Add transition classes for hover effects
  if (
    settings.hoverBackgroundColor ||
    settings.hoverColor ||
    settings.transitionProperty
  ) {
    classes.push("transition-all duration-300");
  }

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

  return classes.join(" ");
}

// Optimized heading component
export const HeadingElement = memo(
  ({
    element,
    comprehensiveStyle,
    comprehensiveClasses,
  }: {
    element: Element;
    onTextChange?: (e: React.FormEvent<HTMLDivElement>) => void;
    isEditMode?: boolean;
    comprehensiveStyle?: React.CSSProperties;
    comprehensiveClasses?: string[];
  }) => {
    const settings = element.settings || {};
    const level = settings.level || "h2";
    const textAlign = settings.textAlign || "left";

    const textAlignClass = getTextAlignClass(textAlign);

    // Styling is now handled by ElementRenderer

    const HeadingTag = level as keyof JSX.IntrinsicElements;

    return (
      <HeadingTag
        className={cn(
          "heading-element outline-none",
          textAlignClass,
          ...(comprehensiveClasses || [])
        )}
        style={comprehensiveStyle}
        data-element-id={element.id}
        data-element-type="heading"
      >
        <div 
          dangerouslySetInnerHTML={{ __html: element.content || "Heading" }}
        />
      </HeadingTag>
    );
  }
);

HeadingElement.displayName = "HeadingElement";

// Optimized text component
export const TextElement = memo(
  ({
    element,
    comprehensiveStyle,
    comprehensiveClasses,
  }: {
    element: Element;
    onTextChange?: (e: React.FormEvent<HTMLDivElement>) => void;
    isEditMode?: boolean;
    comprehensiveStyle?: React.CSSProperties;
    comprehensiveClasses?: string[];
  }) => {
    const settings = element.settings || {};
    const textAlign = settings.textAlign || "left";

    const textAlignClass = getTextAlignClass(textAlign);

    // Styling is now handled by ElementRenderer

    return (
      <div
        className={cn(
          "text-element outline-none",
          textAlignClass,
          ...(comprehensiveClasses || [])
        )}
        style={{
          // Ensure text elements have proper default styling like headings
          minHeight: "1.2em",
          lineHeight: "1.5",
          fontSize: "16px", // Default font size
          display: "block", // Ensure block display
          width: "100%", // Ensure full width
          ...comprehensiveStyle, // Allow overrides
        }}
        data-element-id={element.id}
        data-element-type="text"
      >
        <div 
          dangerouslySetInnerHTML={{ __html: element.content || "Text content" }}
        />
      </div>
    );
  }
);

TextElement.displayName = "TextElement";

// Optimized list component
export const ListElement = memo(
  ({
    element,
  }: {
    element: Element;
    onTextChange?: (e: React.FormEvent<HTMLDivElement>) => void;
    isEditMode?: boolean;
  }) => {
    const settings = element.settings || {};
    const listType = settings.listType || "ul";
    const textAlign = settings.textAlign || "left";

    const textAlignClass = getTextAlignClass(textAlign);
    const ListTag = listType as keyof JSX.IntrinsicElements;
    const listClass = listType === "ul" ? "list-disc" : "list-decimal";

    // Styling is now handled by ElementRenderer

    return (
      <ListTag
        className={cn(
          "list-element outline-none pl-5",
          listClass,
          textAlignClass
        )}
        data-element-id={element.id}
        data-element-type="list"
      >
        <div 
          dangerouslySetInnerHTML={{ 
            __html: element.content || "<li>List item 1</li><li>List item 2</li><li>List item 3</li>"
          }}
        />
      </ListTag>
    );
  }
);

ListElement.displayName = "ListElement";

// Optimized quote component
export const QuoteElement = memo(
  ({
    element,
  }: {
    element: Element;
    onTextChange?: (e: React.FormEvent<HTMLDivElement>) => void;
    isEditMode?: boolean;
  }) => {
    const t = useTranslations("dashboard");
    const settings = element.settings || {};
    const textAlign = settings.textAlign || "center";
    const author = settings.author || "Author";
    const source = settings.source || "Source";

    const textAlignClass = getTextAlignClass(textAlign);
    // Styling is now handled by ElementRenderer

    return (
      <figure
        className={cn(textAlignClass)}
      >
        <blockquote
          className={cn(
            "quote-element outline-none italic border-l-4 border-gray-300 pl-4",
            textAlignClass
          )}
          data-element-id={element.id}
          data-element-type="quote"
        >
          <div 
            dangerouslySetInnerHTML={{ __html: element.content || "Quote" }}
          />
        </blockquote>
        <figcaption
          className={cn("mt-2 text-sm text-gray-600", textAlignClass)}
        >
          {'—'}
          <span className="font-medium">{author}</span>
          {','} <cite className="text-gray-500">{source}</cite>
        </figcaption>
      </figure>
    );
  }
);

QuoteElement.displayName = "QuoteElement";

// Optimized icon component
export const IconElementComponent = memo(
  ({
    element,
  }: {
    element: Element;
    onTextChange?: (e: React.FormEvent<HTMLDivElement>) => void;
    isEditMode?: boolean;
  }) => {
    const t = useTranslations("dashboard");
    const settings = element.settings || {};
    const iconName = settings.iconName || "star";
    const size = settings.size || 24;

    const IconComponent = useMemo(() => getIconComponent(iconName), [iconName]);

    if (!IconComponent) {
      return (
        <div className="flex justify-center items-center py-2 w-full">
          <span>{t("icon_not_found")}</span>
        </div>
      );
    }

    return (
      <div
        className="flex justify-center items-center py-2 w-full"
        data-element-id={element.id}
        data-element-type="icon"
      >
        <IconComponent
          className="h-6 w-6"
          style={{ width: `${size}px`, height: `${size}px` }}
        />
      </div>
    );
  }
);

IconElementComponent.displayName = "IconElement";

// Optimized link component
export const LinkElement = memo(
  ({
    element,
    comprehensiveStyle,
    comprehensiveClasses,
  }: {
    element: Element;
    onTextChange?: (e: React.FormEvent<HTMLDivElement>) => void;
    isEditMode?: boolean;
    comprehensiveStyle?: React.CSSProperties;
    comprehensiveClasses?: string[];
  }) => {
    const settings = element.settings || {};
    const href = settings.href || settings.url || "#";
    const target = settings.target || "_self";
    const textAlign = settings.textAlign || "left";

    const textAlignClass = getTextAlignClass(textAlign);

    const handleClick = (e: React.MouseEvent) => {
      // Links are always clickable since we removed inline editing
    };

    // Simplified structure - single wrapper with consolidated classes
    return (
      <a
        href={href}
        target={target}
        className={cn(
          "link-element outline-none underline cursor-pointer hover:opacity-80 transition-opacity",
          textAlignClass,
          ...(comprehensiveClasses || [])
        )}
        style={comprehensiveStyle}
        onClick={handleClick}
        data-element-id={element.id}
        data-element-type="link"
      >
        <span 
          dangerouslySetInnerHTML={{ __html: element.content || "Link" }}
        />
      </a>
    );
  }
);

LinkElement.displayName = "LinkElement";
