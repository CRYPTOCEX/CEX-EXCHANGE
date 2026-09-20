import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

function tier(opts: {
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
      backgroundColor: theme.bgCard,
      borderColor: opts.highlighted ? theme.primary : theme.border,
      borderWidth: opts.highlighted ? 2 : 1,
      borderRadius: 20,
      padding: 40,
      boxShadowX: 0,
      boxShadowY: opts.highlighted ? 24 : 8,
      boxShadowBlur: opts.highlighted ? 48 : 24,
      boxShadowSpread: -12,
      boxShadowColor: opts.highlighted
        ? "rgba(31,113,235,0.35)"
        : "rgba(10,18,32,0.06)",
    },
    [
      el.text(opts.name.toUpperCase(), {
        fontSize: 12,
        fontWeight: "700",
        color: opts.highlighted ? theme.primary : theme.textMuted,
        letterSpacing: "0.14em",
        marginBottom: 16,
      }),
      el.heading(opts.price, {
        level: "h3",
        fontSize: 56,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        lineHeight: "1",
        marginBottom: 4,
      }),
      el.text(opts.cadence, {
        fontSize: 14,
        color: theme.textMuted,
        marginBottom: 20,
      }),
      el.text(opts.description, {
        fontSize: 15,
        color: theme.textMuted,
        marginBottom: 24,
        lineHeight: "1.55",
      }),
      el.list(opts.features, { marginBottom: 28 }),
      el.button(opts.cta, "/signup", {
        width: "100%",
        fontSize: 15,
        marginRight: 0,
        backgroundColor: opts.highlighted ? theme.primary : theme.bgMuted,
        color: opts.highlighted ? theme.primaryText : theme.text,
      }),
    ]
  );
}

export const pricingThreeTierClassic: Section = section(
  [
    singleColumnRow([
      el.text("PRICING", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 16,
      }),
      el.heading("Simple pricing, no surprises", {
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: "-0.03em",
        marginBottom: 16,
      }),
      el.text("Choose a plan that scales with you. Cancel anytime.", {
        fontSize: 19,
        textAlign: "center",
        marginBottom: 56,
        maxWidth: "580px",
        marginLeft: "auto",
        marginRight: "auto",
      }),
    ]),
    row(
      [
        col(33.33, [
          tier({
            name: "Starter",
            price: "$19",
            cadence: "per month",
            description: "For individuals getting started with automated trading.",
            features: [
              "Up to 3 live strategies",
              "Real-time charts on 50 pairs",
              "Email alerts",
              "Community support",
            ],
            cta: "Start free trial",
          }),
        ]),
        col(33.33, [
          tier({
            name: "Pro",
            price: "$49",
            cadence: "per month",
            description: "For active traders who need more power and automation.",
            features: [
              "Unlimited strategies",
              "API access & webhooks",
              "Advanced backtesting",
              "Priority email support",
              "Custom indicators",
            ],
            cta: "Start free trial",
            highlighted: true,
          }),
        ]),
        col(33.33, [
          tier({
            name: "Enterprise",
            price: "$149",
            cadence: "per month",
            description: "For desks and funds with dedicated support needs.",
            features: [
              "Everything in Pro",
              "Dedicated node option",
              "SSO & audit logs",
              "Dedicated CSM",
              "Priority support SLA",
            ],
            cta: "Contact sales",
          }),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24 }
    ),
  ],
  {
    name: "Three-Tier Classic",
    description: "Three tiers side-by-side with the middle plan highlighted",
    category: "pricing",
    slug: "pricing-three-tier-classic",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
