"use client";

import { motion } from "framer-motion";
import { Check, X, Zap, Info } from "lucide-react";
import { Link } from "@/i18n/routing";
import { PricingPlanConfig, PricingLayoutConfig } from "./types";
import { ThemeConfig, getColor, getGradient } from "../shared/types";

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
    default: "bg-white dark:bg-zinc-900",
    bordered: "bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800",
    elevated: "bg-white dark:bg-zinc-900 shadow-2xl dark:shadow-zinc-900/50",
    glass:
      "bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10",
    gradient: "bg-white dark:bg-zinc-900 relative overflow-hidden",
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

  const Wrapper = animate ? motion.div : "div";
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
            className="px-4 py-1 rounded-full text-sm font-semibold text-white flex items-center gap-1 shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            <Zap className="w-3 h-3 fill-white" />
            <span>Most Popular</span>
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
              color: "white",
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
            background: `linear-gradient(135deg, ${gradient.from}15, ${gradient.to}15)`,
          }}
        >
          <plan.icon className="w-7 h-7" style={{ color: primaryColor }} />
        </div>
      )}

      {/* Plan name */}
      <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{plan.name}</h3>

      {/* Description */}
      {plan.description && (
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">{plan.description}</p>
      )}

      {/* Price */}
      <div className="mb-8">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold text-zinc-900 dark:text-white">
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
            <span className="text-zinc-500 dark:text-zinc-400">
              /{billingCycle === "annual" ? "year" : "month"}
            </span>
          )}
        </div>

        {/* Savings badge */}
        {savings && billingCycle === "annual" && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium">
            Save {savings}%
          </div>
        )}

        {/* Billing note */}
        {typeof price === "number" && billingCycle === "annual" && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
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
              ? "border-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              : plan.cta.variant === "secondary"
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700"
                : isHighlighted
                  ? "text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  : "border-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
        <div className="h-px bg-zinc-200 dark:bg-zinc-800 mb-6" />

        {featureStyle === "compact" ? (
          // Compact style
          <ul className="space-y-2">
            {plan.features.map((feature, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
              >
                {feature.included ? (
                  <Check className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                ) : (
                  <X className="w-4 h-4 shrink-0 text-zinc-400 dark:text-zinc-600" />
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
                      : "bg-zinc-100 dark:bg-zinc-800"
                  }`}
                  style={
                    feature.included
                      ? {
                          background: `linear-gradient(135deg, ${gradient.from}15, ${gradient.to}15)`,
                        }
                      : {}
                  }
                >
                  {feature.included ? (
                    <Check className="w-4 h-4" style={{ color: primaryColor }} />
                  ) : (
                    <X className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm ${
                      feature.included
                        ? feature.highlighted
                          ? "font-semibold text-zinc-900 dark:text-white"
                          : "text-zinc-700 dark:text-zinc-300"
                        : "text-zinc-400 dark:text-zinc-600 line-through"
                    }`}
                  >
                    {feature.text}
                  </span>
                  {feature.tooltip && feature.included && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
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
