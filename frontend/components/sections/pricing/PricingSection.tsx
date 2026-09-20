"use client";

import { useState } from "react";
import { m } from "framer-motion";
import { Check, X } from "lucide-react";
import { Link } from "@/i18n/routing";
import { PricingSectionProps, PricingPreset, pricingPresets } from "./types";
import { SectionBackground, SectionHeader } from "../shared";
import { paddingClasses, gapClasses, getColor, withAlpha } from "../shared/types";
import PricingCard from "./PricingCard";
import { useTranslations } from "next-intl";

interface PricingSectionComponentProps extends PricingSectionProps {
  preset?: PricingPreset;
}

const columnsClasses = {
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
};

export default function PricingSection({
  header,
  plans,
  layout,
  background,
  animation = { enabled: true },
  theme = { primary: "teal", secondary: "cyan" },
  showComparison,
  comparisonFeatures,
  footer,
  className = "",
  preset,
  id,
}: PricingSectionComponentProps) {
  const t = useTranslations("components");
  // Apply preset if provided
  const presetConfig = preset ? pricingPresets[preset] : null;
  const finalLayout = { ...presetConfig?.layout, ...layout };

  const {
    variant = "cards",
    columns = 3,
    gap = "lg",
    showBillingToggle = true,
    defaultBilling = "monthly",
  } = finalLayout;

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(defaultBilling);
  const primaryColor = getColor(theme.primary || "teal");

  // Billing toggle
  const renderBillingToggle = () => {
    if (!showBillingToggle) return null;

    return (
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-center justify-center gap-3 mb-12"
      >
        <span
          className={`text-sm font-medium transition-colors ${
            billingCycle === "monthly"
              ? "text-foreground"
              : "text-subtle-foreground"
          }`}
        >
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
          className="relative w-14 h-7 rounded-full transition-colors"
          style={{
            backgroundColor: billingCycle === "annual" ? primaryColor : "hsl(var(--border-strong))",
          }}
          aria-label={t("toggle_billing_cycle")}
        >
          <div
            className={`absolute top-1 left-1 w-5 h-5 bg-card rounded-full shadow-md transition-transform ${
              billingCycle === "annual" ? "translate-x-7" : ""
            }`}
          />
        </button>
        <span
          className={`text-sm font-medium transition-colors ${
            billingCycle === "annual"
              ? "text-foreground"
              : "text-subtle-foreground"
          }`}
        >
          Annual
        </span>
        {billingCycle === "annual" && (
          <span
            className="ml-2 px-2 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: `${withAlpha(primaryColor, 0.08)}`,
              color: primaryColor,
            }}
          >
            Save up to 20%
          </span>
        )}
      </m.div>
    );
  };

  // Comparison table
  const renderComparisonTable = () => {
    if (!showComparison || !comparisonFeatures || comparisonFeatures.length === 0) return null;

    return (
      <m.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-16 overflow-x-auto"
      >
        <div className="min-w-full inline-block align-middle">
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="min-w-full divide-y divide-border">
              {/* Header */}
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                    Features
                  </th>
                  {plans.map((plan, idx) => (
                    <th
                      key={idx}
                      className="px-6 py-4 text-center text-sm font-semibold text-foreground"
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody className="bg-card divide-y divide-border">
                {comparisonFeatures.map((feature, featureIdx) => (
                  <tr key={featureIdx} className="hover:bg-muted dark:hover:bg-surface-2/50">
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {feature}
                    </td>
                    {plans.map((plan, planIdx) => {
                      const planFeature = plan.features.find((f) => f.text === feature);
                      const isIncluded = planFeature?.included ?? false;

                      return (
                        <td key={planIdx} className="px-6 py-4 text-center">
                          {isIncluded ? (
                            <Check className="w-5 h-5 mx-auto" style={{ color: primaryColor }} />
                          ) : (
                            <X className="w-5 h-5 mx-auto text-muted-foreground" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </m.div>
    );
  };

  // Footer
  const renderFooter = () => {
    if (!footer) return null;

    return (
      <m.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-12 text-center"
      >
        {footer.text && (
          <p className="text-muted-foreground mb-4">{footer.text}</p>
        )}
        {footer.links && footer.links.length > 0 && (
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {footer.links.map((link, idx) => (
              <Link
                key={idx}
                href={link.href}
                className="text-sm font-medium hover:underline transition-colors"
                style={{ color: primaryColor }}
              >
                {link.text}
              </Link>
            ))}
          </div>
        )}
      </m.div>
    );
  };

  return (
    <section id={id} className={`relative ${paddingClasses.lg} overflow-hidden ${className}`}>
      {/* Background */}
      {background && <SectionBackground config={background} theme={theme} />}

      {/* Content */}
      <div className="container mx-auto relative z-10">
        {/* Header */}
        {header && <SectionHeader config={header} theme={theme} animate={animation.enabled} />}

        {/* Billing Toggle */}
        {renderBillingToggle()}

        {/* Pricing Cards */}
        <div className={`grid ${columnsClasses[columns]} ${gapClasses[gap]} items-start`}>
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.id || index}
              plan={plan}
              layout={finalLayout}
              theme={theme}
              index={index}
              billingCycle={billingCycle}
              animate={animation.enabled}
            />
          ))}
        </div>

        {/* Comparison Table */}
        {renderComparisonTable()}

        {/* Footer */}
        {renderFooter()}
      </div>
    </section>
  );
}
