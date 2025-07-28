"use client";

import React, { JSX } from "react";
import type { Element } from "@/types/builder";
import { cn } from "@/lib/utils";

// Import icons
import { Layers, Grid, Star, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

// Helper function to render text with proper formatting
const renderFormattedText = (text: string) => {
  return text.split("\n").map((line, i) => (
    <React.Fragment key={i}>
      {line}
      {i < text.split("\n").length - 1 && <br />}
    </React.Fragment>
  ));
};

// Render a heading element
const renderHeading = (element: Element) => {
  const { settings } = element;
  const level = settings?.level || 2;
  const text = settings?.text || "Heading";
  const color = settings?.color || "#000000";
  const alignment = settings?.alignment || "left";
  const fontSize =
    settings?.fontSize ||
    (level === 1
      ? 36
      : level === 2
        ? 30
        : level === 3
          ? 24
          : level === 4
            ? 20
            : 18);

  const style: React.CSSProperties = {
    color: color as React.CSSProperties["color"],
    textAlign: alignment as React.CSSProperties["textAlign"],
    fontSize: `${fontSize}px`,
    fontWeight: settings?.fontWeight || (level <= 2 ? 700 : 600),
    lineHeight: settings?.lineHeight || 1.2,
    marginBottom: settings?.marginBottom || "0.5em",
    marginTop: settings?.marginTop || "0.5em",
  };

  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <HeadingTag style={style} className="font-heading">
      {renderFormattedText(text)}
    </HeadingTag>
  );
};

// Render a text/paragraph element
const renderText = (element: Element) => {
  const { settings } = element;
  const text = settings?.text || "Text content goes here";
  const color = settings?.color || "#333333";
  const alignment = settings?.alignment || "left";
  const fontSize = settings?.fontSize || 16;

  const style: React.CSSProperties = {
    color: color as React.CSSProperties["color"],
    textAlign: alignment as React.CSSProperties["textAlign"],
    fontSize: `${fontSize}px`,
    lineHeight: settings?.lineHeight || 1.6,
    marginBottom: settings?.marginBottom || "1em",
    marginTop: settings?.marginTop || "0",
  };

  return <p style={style}>{renderFormattedText(text)}</p>;
};

// Render a button element
const renderButton = (element: Element) => {
  const { settings } = element;
  const text = settings?.text || "Button";
  const url = settings?.url || "#";
  const backgroundColor = String(settings?.backgroundColor || "#3b82f6");
  const textColor = String(settings?.textColor || "#ffffff");
  const size = settings?.size || "medium";
  const borderRadius = settings?.borderRadius || 4;
  const fullWidth = settings?.fullWidth || false;
  const alignment = settings?.alignment || "left";

  const sizeClasses = {
    small: "py-1 px-3 text-sm",
    medium: "py-2 px-4 text-base",
    large: "py-3 px-6 text-lg",
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor,
    color: textColor,
    borderRadius: `${borderRadius}px`,
    display: "inline-block",
    fontWeight: 500,
    textDecoration: "none",
    textAlign: "center",
    width: fullWidth ? "100%" : "auto",
  };

  const containerStyle = {
    textAlign: alignment as any,
    width: "100%",
  };

  return (
    <div style={containerStyle}>
      <a
        href={url}
        className={cn(
          "inline-block",
          sizeClasses[size as keyof typeof sizeClasses]
        )}
        style={buttonStyle}
      >
        {text}
      </a>
    </div>
  );
};

// Render an image element
const renderImage = (element: Element) => {
  const { settings } = element;
  const src = settings?.src || "/placeholder.svg?height=300&width=500";
  const alt = settings?.alt || "Image";
  const width = settings?.width || "100%";
  const height = settings?.height || "auto";
  const alignment = settings?.alignment || "center";
  const borderRadius = settings?.borderRadius || 0;

  const containerStyle = {
    textAlign: alignment as any,
    width: "100%",
  };

  const imageStyle = {
    maxWidth: width,
    height,
    borderRadius: `${borderRadius}px`,
    display: typeof width === "number" ? "inline-block" : "block",
    margin:
      alignment === "center"
        ? "0 auto"
        : alignment === "right"
          ? "0 0 0 auto"
          : "0",
  };

  return (
    <div style={containerStyle}>
      <img src={src || "/placeholder.svg"} alt={alt} style={imageStyle} />
    </div>
  );
};

// Render a divider element
const renderDivider = (element: Element) => {
  const { settings } = element;
  const color = settings?.color || "#e5e7eb";
  const thickness = settings?.thickness || 1;
  const style = settings?.style || "solid";
  const width = settings?.width || "100%";
  const marginTop = settings?.marginTop || 20;
  const marginBottom = settings?.marginBottom || 20;

  const dividerStyle = {
    borderTop: `${thickness}px ${style} ${color}`,
    width: typeof width === "number" ? `${width}px` : width,
    marginTop: `${marginTop}px`,
    marginBottom: `${marginBottom}px`,
    marginLeft: "auto",
    marginRight: "auto",
  };

  return <div style={dividerStyle}></div>;
};

// Render a spacer element
const renderSpacer = (element: Element) => {
  const { settings } = element;
  const height = settings?.height || 40;

  return <div style={{ height: `${height}px` }}></div>;
};

// Render a card element
const renderCard = (element: Element) => {
  const { settings } = element;
  const title = settings?.title || "Card Title";
  const content = settings?.content || "Card content goes here";
  const backgroundColor = settings?.backgroundColor || "#ffffff";
  const borderColor = settings?.borderColor || "#e5e7eb";
  const borderRadius = settings?.borderRadius || 8;
  const padding = settings?.padding || 20;
  const shadow = settings?.shadow || "sm";

  const shadowClasses = {
    none: "shadow-none",
    sm: "shadow-sm",
    md: "shadow",
    lg: "shadow-md",
    xl: "shadow-lg",
  };

  const cardStyle = {
    backgroundColor: String(backgroundColor),
    borderRadius: `${borderRadius}px`,
    border: `1px solid ${String(borderColor)}`,
    padding: `${padding}px`,
    overflow: "hidden",
  };

  return (
    <div
      className={cn(shadowClasses[shadow as keyof typeof shadowClasses])}
      style={cardStyle}
    >
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-gray-600">{content}</p>
    </div>
  );
};

// Render a feature element
const renderFeature = (element: Element) => {
  const { settings } = element;
  const title = settings?.title || "Feature Title";
  const description = settings?.description || "Feature description goes here";
  const iconName = settings?.icon || "sparkles";
  const iconColor = settings?.iconColor || "#3b82f6";
  const alignment = settings?.alignment || "left";

  const getIcon = () => {
    switch (iconName) {
      case "sparkles":
        return <Sparkles size={24} color={iconColor} />;
      case "star":
        return <Star size={24} color={iconColor} />;
      case "layers":
        return <Layers size={24} color={iconColor} />;
      case "grid":
        return <Grid size={24} color={iconColor} />;
      default:
        return <Sparkles size={24} color={iconColor} />;
    }
  };

  return (
    <div
      className={cn(
        "flex",
        alignment === "center"
          ? "flex-col items-center text-center"
          : "items-start"
      )}
    >
      <div className="mb-3">{getIcon()}</div>
      <div>
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
};

// Main element renderer function
export function renderElement(element: Element) {
  const t = useTranslations("dashboard");
  if (!element) return null;

  switch (element.type) {
    case "heading":
      return renderHeading(element);
    case "text":
      return renderText(element);
    case "button":
      return renderButton(element);
    case "image":
      return renderImage(element);
    case "divider":
      return renderDivider(element);
    case "spacer":
      return renderSpacer(element);
    case "card":
      return renderCard(element);
    case "feature":
      return renderFeature(element);
    default:
      return (
        <div className="p-4 border border-dashed border-gray-300 rounded bg-gray-50 text-center">
          <p className="text-sm text-gray-500">
            {element.type}
            {t("element_(preview_not_available)")}
          </p>
        </div>
      );
  }
}
