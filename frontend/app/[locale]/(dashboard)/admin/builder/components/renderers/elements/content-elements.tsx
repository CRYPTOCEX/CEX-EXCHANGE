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
import { useTheme } from "next-themes";
import { resolveBackgroundColor, type ColorValue } from "./color-utils";

// Optimized Card Element
export const CardElement = memo(({
  element,
  /**
   * Supplied by the dispatcher in `./index`. Passed in rather than imported
   * because `index` already imports this module — importing it back would make
   * the cycle load-order dependent.
   */
  renderChild,
}: {
  element: Element;
  renderChild?: (child: Element) => React.ReactNode;
}) => {
  const settings = element.settings || {};
  /* `resolvedTheme`, not `theme`: next-themes reports the literal string
     "system" until the user picks explicitly, so `theme === "dark"` is false
     for a system-dark visitor and the light branch would be chosen. */
  const { resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme === "dark" ? "dark" : "light";
  const {
    title = "Card Title",
    description = "This is a card description that can include text content.",
    imageSrc = "/placeholder.svg?height=200&width=400",
    buttonText = "Learn More",
    /* Was `#ffffff`, which made a card element a white slab in dark mode. This
       lands in an inline `React.CSSProperties` (see `cardStyle`), so the full
       `hsl(var(--card))` form is correct here — not the `[hsl(var(--card))]`
       class fragment the section/row renderers need. */
    backgroundColor = "hsl(var(--card))",
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

  /**
   * `String(backgroundColor)` was the whole background implementation, which
   * meant a gradient object stringified to the literal `"[object Object]"` and
   * CSSOM discarded it — the card rendered transparent. Every template that
   * composed a dark band with `el.card({ backgroundColor: gradients.x })` and
   * then pinned white ink on it was therefore painting white text on the page
   * surface: invisible in light mode.
   *
   * `resolveBackgroundColor` already handled gradients, theme objects and plain
   * strings correctly — it just had no callers. Using it here fixes the whole
   * class of defect at the renderer instead of per template.
   */
  const resolved = useMemo(
    () => resolveBackgroundColor(backgroundColor as ColorValue, currentTheme),
    [backgroundColor, currentTheme]
  );

  const cardStyle = useMemo(
    (): React.CSSProperties => ({
      ...resolved.styles,
      borderRadius: `${borderRadius}px`,
    }),
    [resolved, borderRadius]
  );

  const shadowClass =
    shadowClasses[shadow as keyof typeof shadowClasses] || "shadow-md";

  /**
   * `el.card(settings, [children])` stores those children, and this component
   * ignored them completely — 116 calls across 77 section templates rendered as
   * a stock placeholder (a grey image, "Card Title", a "Learn More" button)
   * instead of their authored content.
   *
   * Children now win when present. The stock layout is kept as the fallback so
   * a card element created through the builder UI — which has no children and
   * relies on the title/description/image settings — is unaffected.
   */
  const children = Array.isArray(element.children) ? element.children : [];

  return (
    <div
      className={cn(
        "overflow-hidden border border-border",
        shadowClass,
        ...resolved.classes
      )}
      style={cardStyle}
      data-element-id={element.id}
      data-element-type="card"
    >
      {children.length > 0 && renderChild ? (
        <div className="p-5">
          {children.map((child) => (
            <React.Fragment key={child.id}>{renderChild(child)}</React.Fragment>
          ))}
        </div>
      ) : (
        <>
          <div className="aspect-video bg-muted relative">
            <img
              src={imageSrc || "/placeholder.svg"}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="p-5">
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground mb-4">{description}</p>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
              {buttonText}
            </button>
          </div>
        </>
      )}
    </div>
  );
});

CardElement.displayName = "CardElement";

// Optimized Pricing Element
export const PricingElement = memo(({ element }: { element: Element }) => {
  const t = useTranslations("common");
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
          ? "border-primary ring-1 ring-primary"
          : "border-border"
      ),
    [highlighted]
  );

  const buttonClasses = useMemo(
    () =>
      cn(
        "w-full py-2 rounded font-medium transition-colors",
        highlighted
          ? "bg-primary text-primary-foreground hover:bg-primary"
          : "bg-muted text-foreground hover:bg-muted"
      ),
    [highlighted]
  );

  /**
   * The price is the one FIGURE on this card, so it takes the monospaced,
   * tabular treatment — but only when it really is a number. `price` is author
   * copy and is just as likely to read "Contact us", and a 30px prose string set
   * in a monospace face reads as broken. Same test the shared StatsCard uses:
   * digits present, and no word in it (a currency or unit suffix is 1-2 chars).
   */
  const priceIsFigure =
    /\d/.test(String(price)) && !/[A-Za-z]{3,}/.test(String(price));

  return (
    <div
      className={containerClasses}
      data-element-id={element.id}
      data-element-type="pricing"
    >
      {highlighted && (
        <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
          {t("popular")}
        </div>
      )}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-2">{planName}</h3>
        <div className="flex items-baseline mb-4">
          <span
            className={cn(
              "text-3xl font-semibold leading-tight tracking-tight",
              priceIsFigure && "font-mono tabular-nums"
            )}
          >
            {price}
          </span>
          <span className="text-subtle-foreground ml-1">
            _
            {period}
          </span>
        </div>
        <ul className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <Check className="h-5 w-5 text-success mr-2 flex-shrink-0" />
              <span className="text-muted-foreground">{feature}</span>
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
        "text-foreground rounded-lg overflow-hidden",
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
          <p className="text-primary mb-6 max-w-2xl mx-auto">{subheading}</p>
          <button className="px-6 py-3 bg-card text-primary font-medium rounded-lg hover:bg-muted transition-colors">
            {buttonText}
          </button>
        </>
      ) : (
        <>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{heading}</h2>
            <p className="text-primary">{subheading}</p>
          </div>
          <div className="ml-6">
            <button className="px-6 py-3 bg-card text-primary font-medium rounded-lg hover:bg-muted transition-colors whitespace-nowrap">
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
  const t = useTranslations("common");
  const settings = element.settings || {};
  const type = settings.type || "info";
  const title = settings.title || t("information");
  const message = settings.message || t("this_is_an_informational_notification");
  const dismissible = settings.dismissible !== false;

  const typeStyles = useMemo(
    () => ({
      info: {
        bg: "bg-primary/10",
        border: "border-primary/30",
        icon: <Info className="h-5 w-5 text-primary" />,
        title: "text-primary",
        message: "text-primary",
      },
      success: {
        bg: "bg-success",
        border: "border-success",
        icon: <CheckCircle className="h-5 w-5 text-success" />,
        title: "text-success",
        message: "text-success",
      },
      warning: {
        bg: "bg-warning",
        border: "border-warning",
        icon: <AlertCircle className="h-5 w-5 text-warning" />,
        title: "text-warning",
        message: "text-warning",
      },
      error: {
        bg: "bg-destructive/10",
        border: "border-destructive",
        icon: <XCircle className="h-5 w-5 text-destructive" />,
        title: "text-destructive",
        message: "text-destructive",
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
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
          <IconComponent className="h-6 w-6 text-primary-ink" />
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
});

FeatureElement.displayName = "FeatureElement";
