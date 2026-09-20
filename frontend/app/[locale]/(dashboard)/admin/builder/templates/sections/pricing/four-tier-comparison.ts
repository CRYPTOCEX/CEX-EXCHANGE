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
  accent?: boolean;
}) {
  return el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: opts.accent ? theme.primary : theme.border,
      borderWidth: opts.accent ? 2 : 1,
      borderRadius: 18,
      padding: 28,
    },
    [
      el.text(opts.name.toUpperCase(), {
        fontSize: 11,
        fontWeight: "700",
        color: opts.accent ? theme.primary : theme.textMuted,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading(opts.price, {
        level: "h3",
        fontSize: 40,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        lineHeight: "1",
        marginBottom: 4,
      }),
      el.text(opts.cadence, {
        fontSize: 13,
        color: theme.textMuted,
        marginBottom: 16,
      }),
      el.text(opts.description, {
        fontSize: 14,
        color: theme.textMuted,
        marginBottom: 20,
        lineHeight: "1.5",
      }),
      el.list(opts.features, { fontSize: 14, marginBottom: 24 }),
      el.button(opts.cta, "/signup", {
        width: "100%",
        fontSize: 14,
        marginRight: 0,
        backgroundColor: opts.accent ? theme.primary : theme.bgMuted,
        color: opts.accent ? theme.primaryText : theme.text,
      }),
    ]
  );
}

export const pricingFourTierComparison: Section = section(
  [
    singleColumnRow([
      el.text("PLANS", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 16,
      }),
      el.heading("A plan for every stage", {
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: "-0.03em",
        marginBottom: 16,
      }),
      el.text("From hobbyist to enterprise desk — grow into the next tier when you're ready.", {
        fontSize: 18,
        textAlign: "center",
        marginBottom: 56,
        maxWidth: "620px",
        marginLeft: "auto",
        marginRight: "auto",
      }),
    ]),
    row(
      [
        col(25, [
          tier({
            name: "Free",
            price: "$0",
            cadence: "forever",
            description: "For exploring the product.",
            features: [
              "1 live strategy",
              "Paper trading",
              "Community support",
              "5 watchlists",
            ],
            cta: "Get started",
          }),
        ]),
        col(25, [
          tier({
            name: "Pro",
            price: "$29",
            cadence: "per month",
            description: "For serious individual traders.",
            features: [
              "Unlimited strategies",
              "API & webhook access",
              "Advanced backtesting",
              "Priority support",
            ],
            cta: "Start free trial",
            accent: true,
          }),
        ]),
        col(25, [
          tier({
            name: "Team",
            price: "$99",
            cadence: "per month",
            description: "For small trading teams.",
            features: [
              "Up to 5 seats",
              "Shared strategies",
              "Role-based access",
              "Audit logs",
            ],
            cta: "Start free trial",
          }),
        ]),
        col(25, [
          tier({
            name: "Enterprise",
            price: "Custom",
            cadence: "volume pricing",
            description: "For funds and institutional desks.",
            features: [
              "Unlimited seats",
              "SSO & SCIM",
              "Dedicated CSM",
              "Priority support SLA",
            ],
            cta: "Contact sales",
          }),
        ]),
      ],
      { ...rowPresets.wide, gutter: 18 }
    ),
  ],
  {
    name: "Four-Tier Comparison",
    description: "Four tiers side-by-side: Free, Pro, Team, and Enterprise",
    category: "pricing",
    slug: "pricing-four-tier-comparison",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
