import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  gradients,
  sectionPresets,
  rowPresets,
} from "../../utils";

function glassTier(opts: {
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}) {
  return el.card(
    {
      backgroundColor: opts.highlighted
        ? theme.onBandBorder
        : theme.onBandFill,
      borderColor: opts.highlighted
        ? theme.onBandDim
        : theme.onBandBorder,
      borderWidth: 1,
      borderRadius: 24,
      padding: 40,
      blur: 20,
      boxShadowX: 0,
      boxShadowY: 24,
      boxShadowBlur: 48,
      boxShadowSpread: -12,
      boxShadowColor: "rgba(10,18,32,0.2)",
    },
    [
      el.text(opts.name.toUpperCase(), {
        fontSize: 12,
        fontWeight: "700",
        color: theme.onBandMuted,
        letterSpacing: "0.14em",
        marginBottom: 16,
      }),
      el.heading(opts.price, {
        level: "h3",
        fontSize: 56,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        lineHeight: "1",
        color: theme.onBand,
        marginBottom: 4,
      }),
      el.text(opts.cadence, {
        fontSize: 14,
        color: theme.onBandDim,
        marginBottom: 20,
      }),
      el.text(opts.description, {
        fontSize: 15,
        color: theme.onBandMuted,
        marginBottom: 24,
      }),
      el.list(opts.features, {
        marginBottom: 28,
        color: theme.onBandMuted,
      }),
      el.button(opts.cta, "/signup", {
        width: "100%",
        fontSize: 15,
        marginRight: 0,
        backgroundColor: opts.highlighted
          ? theme.onBandSurface
          : theme.onBandFill,
        color: opts.highlighted
          ? theme.onBandSurfaceInk
          : theme.onBand,
        borderWidth: opts.highlighted ? 0 : 1,
        borderStyle: "solid",
        borderColor: theme.onBandBorder,
      }),
    ]
  );
}

export const pricingGlassCards: Section = section(
  [
    singleColumnRow([
      el.text("PRICING", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.onBandMuted,
        letterSpacing: "0.14em",
        marginBottom: 16,
      }),
      el.heading("Transparent pricing, zero lock-in", {
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        color: theme.onBand,
        letterSpacing: "-0.03em",
        marginBottom: 16,
      }),
      el.text(
        "Start on any plan, change whenever you need to. Your data stays yours, always.",
        {
          fontSize: 19,
          textAlign: "center",
          color: theme.onBandMuted,
          marginBottom: 56,
          maxWidth: "620px",
          marginLeft: "auto",
          marginRight: "auto",
        }
      ),
    ]),
    row(
      [
        col(33.33, [
          glassTier({
            name: "Starter",
            price: "$15",
            cadence: "per month",
            description: "For indie traders testing the waters.",
            features: [
              "3 live strategies",
              "5K API calls / day",
              "Standard data feeds",
              "Community support",
            ],
            cta: "Get started",
          }),
        ]),
        col(33.33, [
          glassTier({
            name: "Pro",
            price: "$49",
            cadence: "per month",
            description: "For serious, full-time traders.",
            features: [
              "Unlimited strategies",
              "100K API calls / day",
              "Premium data feeds",
              "Priority support",
              "Custom indicators",
            ],
            cta: "Start free trial",
            highlighted: true,
          }),
        ]),
        col(33.33, [
          glassTier({
            name: "Scale",
            price: "$199",
            cadence: "per month",
            description: "For teams and quant desks.",
            features: [
              "Everything in Pro",
              "Unlimited API calls",
              "Dedicated infrastructure",
              "SSO & audit logs",
              "Phone support",
            ],
            cta: "Talk to sales",
          }),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24 }
    ),
  ],
  {
    name: "Glass Cards",
    description: "Three glassmorphic tiers on a rich gradient background",
    category: "pricing",
    slug: "pricing-glass-cards",
    type: "fullwidth",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: gradients.aurora,
    },
  }
);
