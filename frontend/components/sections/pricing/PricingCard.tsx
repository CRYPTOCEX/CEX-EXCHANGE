"use client";

import { m } from "framer-motion";
import { Check, X, Zap, Info } from "lucide-react";
import { Link } from "@/i18n/routing";
import { PricingPlanConfig, PricingLayoutConfig } from "./types";
import { ThemeConfig, getColor, getGradient, withAlpha } from "../shared/types";
import { useTranslations } from "next-intl";

interface PricingCardProps {
  plan: PricingPlanConfig;
  layout: PricingLayoutConfig;
  theme: ThemeConfig;
  index: number;
  billingCycle: "monthly" | "annual";
  animate?: boolean;
}

export default function PricingCard({
  plan,
  layout,
  theme,
  index,
  billingCycle,
  animate = true,
}: PricingCardProps) {
  const t = useTranslations("common");
  const {
    cardStyle = "bordered",
    featureStyle = "list",
    highlightPopular = true,
    showIcon = true,
  } = layout;

  const primaryColor = getColor(theme.primary || "teal");
  const gradient = getGradient(theme.primary || "teal");

  const isPopular = plan.popular && highlightPopular;
  const isHighlighted = plan.highlighted || isPopular;

  // Card style classes
  const cardStyles: Record<string, string> = {
    default: "bg-card",
    bordered: "bg-card border-2 border-border",
    elevated: "bg-card shadow-2xl shadow-shadow/[calc(0.25*var(--card-shadow-strength))] dark:shadow-surface-2/[calc(0.5*var(--card-shadow-strength))]",
    glass:
      "bg-card/60 dark:bg-card/5 backdrop-blur-xl border border-border/50 border-border",
    gradient: "bg-card relative overflow-hidden",
  };

  // Get price based on billing cycle
  const price =
    billingCycle === "annual" && plan.price.annual !== undefined
      ? plan.price.annual
      : plan.price.monthly;

  const currencySymbol = plan.price.currencySymbol || "$";
  const currency = plan.price.currency || "USD";

  // Calculate savings if annual pricing available
  const savings =
    billingCycle === "annual" &&
    typeof plan.price.annual === "number" &&
    typeof plan.price.monthly === "number"
      ? Math.round(((plan.price.monthly * 12 - plan.price.annual) / (plan.price.monthly * 12)) * 100)
      : null;

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: index * 0.15,
        ease: [0.21, 0.47, 0.32, 0.98] as const,
      },
    },
  };

  const Wrapper = animate ? m.div : "div";
  const wrapperProps = animate
    ? {
        variants: cardVariants,
        initial: "hidden",
        whileInView: "visible",
        viewport: { once: true, margin: "-50px" },
      }
    : {};

  return (
    <Wrapper
      className={`
        relative rounded-3xl p-8 h-full flex flex-col transition-all duration-300
        ${cardStyles[cardStyle]}
        ${isHighlighted ? "scale-105 z-10" : "hover:scale-[1.02]"}
        ${isHighlighted && cardStyle === "bordered" ? "border-2" : ""}
      `}
      style={{
        ...(isHighlighted && cardStyle === "bordered" ? { borderColor: primaryColor } : {}),
      }}
      {...wrapperProps}
    >
      {/* Gradient background effect */}
      {cardStyle === "gradient" && (
        <div
          className="absolute inset-0 opacity-5 dark:opacity-10"
          style={{
            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.via}, ${gradient.to})`,
          }}
        />
      )}

      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div
            className="px-4 py-1 rounded-full text-sm font-semibold text-overlay-foreground flex items-center gap-1 shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            {/* `fill-current` rather than a second ink decision: the glyph then
                always matches the label beside it, whatever that resolves to. */}
            <Zap className="w-3 h-3 fill-current" />
            <span>{t("most_popular")}</span>
          </div>
        </div>
      )}

      {/* Custom badge */}
      {plan.badge && !isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div
            className="px-4 py-1 rounded-full text-sm font-semibold shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
              // `gradient` resolves to `--primary`, so its designed ink pair is
              // the token, not a bare "white" (2.95:1 in dark mode).
              color: "hsl(var(--primary-foreground))",
            }}
          >
            {plan.badge}
          </div>
        </div>
      )}

      {/* Icon */}
      {showIcon && plan.icon && (
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
          style={{
            background: `linear-gradient(135deg, ${withAlpha(gradient.from, 0.08)}, ${withAlpha(gradient.to, 0.08)})`,
          }}
        >
          <plan.icon className="w-7 h-7" style={{ color: primaryColor }} />
        </div>
      )}

      {/* Plan name */}
      <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>

      {/* Description */}
      {plan.description && (
        <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>
      )}

      {/* Price */}
      <div className="mb-8">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold text-foreground">
            {typeof price === "number" ? (
              <>
                {currencySymbol}
                {price}
              </>
            ) : (
              price
            )}
          </span>
          {typeof price === "number" && (
            <span className="text-subtle-foreground">
              /{billingCycle === "annual" ? "year" : "month"}
            </span>
          )}
        </div>

        {/* Savings badge */}
        {savings && billingCycle === "annual" && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/15 border border-success/30 text-foreground text-xs font-medium">
            Save {savings}%
          </div>
        )}

        {/* Billing note */}
        {typeof price === "number" && billingCycle === "annual" && (
          <p className="text-xs text-subtle-foreground mt-2">
            Billed annually (
            {currencySymbol}
            {(price / 12).toFixed(2)}/month)
          </p>
        )}
      </div>

      {/* CTA Button */}
      <Link
        href={plan.cta.href}
        className={`
          w-full py-3 px-6 rounded-xl font-semibold text-center transition-all duration-300
          ${
            plan.cta.variant === "outline"
              ? "border-2 hover:bg-muted"
              : plan.cta.variant === "secondary"
                ? "bg-muted text-foreground hover:bg-muted"
                : isHighlighted
                  ? "text-overlay-foreground shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  : "border-2 hover:bg-muted"
          }
        `}
        style={
          plan.cta.variant === "outline" || !isHighlighted
            ? { borderColor: primaryColor, color: primaryColor }
            : isHighlighted
              ? { background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }
              : {}
        }
      >
        {plan.cta.text}
      </Link>

      {/* Custom content */}
      {plan.customContent && <div className="mt-6">{plan.customContent}</div>}

      {/* Features */}
      <div className="mt-8 flex-1">
        <div className="h-px bg-muted mb-6" />

        {featureStyle === "compact" ? (
          // Compact style
          <ul className="space-y-2">
            {plan.features.map((feature, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                {feature.included ? (
                  <Check className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                ) : (
                  <X className="w-4 h-4 shrink-0 text-muted-foreground" />
                )}
                <span className={!feature.included ? "opacity-50 line-through" : ""}>
                  {feature.text}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          // List or detailed style
          <ul className="space-y-4">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    feature.included
                      ? ""
                      : "bg-muted"
                  }`}
                  style={
                    feature.included
                      ? {
                          background: `linear-gradient(135deg, ${withAlpha(gradient.from, 0.08)}, ${withAlpha(gradient.to, 0.08)})`,
                        }
                      : {}
                  }
                >
                  {feature.included ? (
                    <Check className="w-4 h-4" style={{ color: primaryColor }} />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm ${
                      feature.included
                        ? feature.highlighted
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                        : "text-muted-foreground line-through"
                    }`}
                  >
                    {feature.text}
                  </span>
                  {feature.tooltip && feature.included && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-subtle-foreground">
                      <Info className="w-3 h-3" />
                      <span>{feature.tooltip}</span>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Highlight glow effect */}
      {isHighlighted && (
        <div
          className="absolute inset-0 rounded-3xl opacity-20 dark:opacity-10 -z-10 blur-2xl"
          style={{
            background: `radial-gradient(circle at center, ${primaryColor}, transparent 70%)`,
          }}
        />
      )}
    </Wrapper>
  );
}
