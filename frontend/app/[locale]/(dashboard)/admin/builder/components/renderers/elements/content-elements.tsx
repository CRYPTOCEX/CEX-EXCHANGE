"use client";

import React, { memo, useMemo } from "react";
import type { Element } from "@/types/builder";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle,
  Star,
  Zap,
  Shield,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";

// Optimized Card Element
export const CardElement = memo(({ element }: { element: Element }) => {
  const settings = element.settings || {};
  const {
    title = "Card Title",
    description = "This is a card description that can include text content.",
    imageSrc = "/placeholder.svg?height=200&width=400",
    buttonText = "Learn More",
    backgroundColor = "#ffffff",
    borderRadius = 8,
    shadow = "md",
  } = settings;

  const shadowClasses = useMemo(
    () => ({
      sm: "shadow-sm",
      md: "shadow-md",
      lg: "shadow-lg",
      xl: "shadow-xl",
    }),
    []
  );

  const cardStyle = useMemo(
    (): React.CSSProperties => ({
      backgroundColor: String(backgroundColor),
      borderRadius: `${borderRadius}px`,
    }),
    [backgroundColor, borderRadius]
  );

  const shadowClass =
    shadowClasses[shadow as keyof typeof shadowClasses] || "shadow-md";

  return (
    <div
      className={cn("overflow-hidden border border-gray-200", shadowClass)}
      style={cardStyle}
      data-element-id={element.id}
      data-element-type="card"
    >
      <div className="aspect-video bg-gray-100 relative">
        <img
          src={imageSrc || "/placeholder.svg"}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-5">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
          {buttonText}
        </button>
      </div>
    </div>
  );
});

CardElement.displayName = "CardElement";

// Optimized Pricing Element
export const PricingElement = memo(({ element }: { element: Element }) => {
  const t = useTranslations("dashboard");
  const settings = element.settings || {};
  const {
    planName = "Basic Plan",
    price = "$19",
    period = "monthly",
    features = ["Feature one", "Feature two", "Feature three"],
    buttonText = "Get Started",
    highlighted = false,
  } = settings;

  const containerClasses = useMemo(
    () =>
      cn(
        "border rounded-lg overflow-hidden",
        highlighted
          ? "border-purple-500 ring-1 ring-purple-500"
          : "border-gray-200"
      ),
    [highlighted]
  );

  const buttonClasses = useMemo(
    () =>
      cn(
        "w-full py-2 rounded font-medium transition-colors",
        highlighted
          ? "bg-purple-600 text-white hover:bg-purple-700"
          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
      ),
    [highlighted]
  );

  return (
    <div
      className={containerClasses}
      data-element-id={element.id}
      data-element-type="pricing"
    >
      {highlighted && (
        <div className="bg-purple-500 text-white text-center py-1 text-sm font-medium">
          {t("Popular")}
        </div>
      )}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-2">{planName}</h3>
        <div className="flex items-baseline mb-4">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-gray-500 ml-1">
            {'_'}
            {period}
          </span>
        </div>
        <ul className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
              <span className="text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
        <button className={buttonClasses}>{buttonText}</button>
      </div>
    </div>
  );
});

PricingElement.displayName = "PricingElement";

// Optimized CTA Element
export const CtaElement = memo(({ element }: { element: Element }) => {
  const settings = element.settings || {};
  const {
    heading = "Ready to get started?",
    subheading = "Join thousands of satisfied customers today.",
    buttonText = "Sign Up Now",
    buttonLink = "#",
    layout = "centered",
  } = settings;

  const containerClasses = useMemo(
    () =>
      cn(
        "text-white rounded-lg overflow-hidden",
        layout === "centered" ? "text-center p-8" : "flex items-center p-8"
      ),
    [layout]
  );

  return (
    <div
      className={containerClasses}
      data-element-id={element.id}
      data-element-type="cta"
    >
      {layout === "centered" ? (
        <>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{heading}</h2>
          <p className="text-purple-100 mb-6 max-w-2xl mx-auto">{subheading}</p>
          <button className="px-6 py-3 bg-white text-purple-600 font-medium rounded-md hover:bg-gray-100 transition-colors">
            {buttonText}
          </button>
        </>
      ) : (
        <>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{heading}</h2>
            <p className="text-purple-100">{subheading}</p>
          </div>
          <div className="ml-6">
            <button className="px-6 py-3 bg-white text-purple-600 font-medium rounded-md hover:bg-gray-100 transition-colors whitespace-nowrap">
              {buttonText}
            </button>
          </div>
        </>
      )}
    </div>
  );
});

CtaElement.displayName = "CtaElement";

// Optimized Notification Element
export const NotificationElement = memo(({ element }: { element: Element }) => {
  const settings = element.settings || {};
  const type = settings.type || "info";
  const title = settings.title || "Information";
  const message = settings.message || "This is an informational notification.";
  const dismissible = settings.dismissible !== false;

  const typeStyles = useMemo(
    () => ({
      info: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: <Info className="h-5 w-5 text-blue-500" />,
        title: "text-blue-800",
        message: "text-blue-700",
      },
      success: {
        bg: "bg-green-50",
        border: "border-green-200",
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        title: "text-green-800",
        message: "text-green-700",
      },
      warning: {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
        title: "text-yellow-800",
        message: "text-yellow-700",
      },
      error: {
        bg: "bg-red-50",
        border: "border-red-200",
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        title: "text-red-800",
        message: "text-red-700",
      },
    }),
    []
  );

  const currentStyle =
    typeStyles[type as keyof typeof typeStyles] || typeStyles.info;

  return (
    <div
      className={cn(
        "border rounded-lg p-4",
        currentStyle.bg,
        currentStyle.border
      )}
      data-element-id={element.id}
      data-element-type="notification"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">{currentStyle.icon}</div>
        <div className="flex-1">
          <h4 className={cn("font-medium mb-1", currentStyle.title)}>
            {title}
          </h4>
          <p className={cn("text-sm", currentStyle.message)}>{message}</p>
        </div>
        {dismissible && (
          <button className="flex-shrink-0 ml-3 opacity-70 hover:opacity-100 transition-opacity">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
});

NotificationElement.displayName = "NotificationElement";

// Optimized Feature Element
export const FeatureElement = memo(({ element }: { element: Element }) => {
  const settings = element.settings || {};
  const {
    title = "Feature Title",
    description = "Feature description goes here to explain the benefits.",
    icon = "star",
    layout = "vertical",
  } = settings;

  const iconComponents = useMemo(
    () => ({
      star: Star,
      zap: Zap,
      shield: Shield,
      sparkles: Sparkles,
    }),
    []
  );

  const IconComponent =
    iconComponents[icon as keyof typeof iconComponents] || Star;

  const containerClasses = useMemo(
    () =>
      cn(
        "p-6 text-center",
        layout === "horizontal" ? "flex items-center text-left" : "block"
      ),
    [layout]
  );

  return (
    <div
      className={containerClasses}
      data-element-id={element.id}
      data-element-type="feature"
    >
      <div className={cn("mb-4", layout === "horizontal" ? "mr-4 mb-0" : "")}>
        <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
          <IconComponent className="h-6 w-6 text-purple-600" />
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
});

FeatureElement.displayName = "FeatureElement";
