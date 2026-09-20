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

function sideTier(opts: {
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  cta: string;
}) {
  return el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 18,
      padding: 32,
    },
    [
      el.text(opts.name.toUpperCase(), {
        fontSize: 11,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.14em",
        marginBottom: 14,
      }),
      el.heading(opts.price, {
        level: "h3",
        fontSize: 40,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        lineHeight: "1",
        marginBottom: 4,
      }),
      el.text(opts.cadence, { fontSize: 13, color: theme.textMuted, marginBottom: 18 }),
      el.text(opts.description, { fontSize: 14, marginBottom: 22 }),
      el.list(opts.features, { fontSize: 14, marginBottom: 24 }),
      el.button(opts.cta, "/signup", {
        width: "100%",
        fontSize: 14,
        marginRight: 0,
        backgroundColor: theme.cssSurface3,
        color: theme.cssForeground,
      }),
    ]
  );
}

export const pricingPopularHighlight: Section = section(
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
      el.heading("The plan most traders start with", {
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: "-0.03em",
        marginBottom: 16,
      }),
      el.text(
        "Over 70% of our customers land on Pro. See what you get — and where to go from there.",
        {
          fontSize: 18,
          textAlign: "center",
          marginBottom: 56,
          maxWidth: "620px",
          marginLeft: "auto",
          marginRight: "auto",
        }
      ),
    ]),
    row(
      [
        col(25, [
          sideTier({
            name: "Starter",
            price: "$15",
            cadence: "per month",
            description: "For individual traders just getting going.",
            features: [
              "3 live strategies",
              "Paper trading",
              "Community support",
              "Standard data",
            ],
            cta: "Get started",
          }),
        ]),
        col(50, [
          el.card(
            {
              backgroundColor: theme.bgCard,
              borderColor: theme.primary,
              borderWidth: 2,
              borderRadius: 24,
              padding: 48,
              boxShadowX: 0,
              boxShadowY: 32,
              boxShadowBlur: 64,
              boxShadowSpread: -16,
              boxShadowColor: "rgba(31,113,235,0.5)",
              position: "relative",
            },
            [
              el.text("MOST POPULAR", {
                fontSize: 11,
                fontWeight: "800",
                color: theme.primaryText,
                backgroundColor: theme.primary,
                borderRadius: 999,
                paddingTop: 6,
                paddingBottom: 6,
                paddingLeft: 14,
                paddingRight: 14,
                letterSpacing: "0.14em",
                marginBottom: 20,
                maxWidth: "150px",
              }),
              el.text("PRO", {
                fontSize: 13,
                fontWeight: "700",
                color: theme.primary,
                letterSpacing: "0.14em",
                marginBottom: 16,
              }),
              el.heading("$49", {
                level: "h3",
                fontSize: 72,
                fontWeight: "800",
                letterSpacing: "-0.03em",
                lineHeight: "1",
                marginBottom: 6,
              }),
              el.text("per month, billed monthly", {
                fontSize: 15,
                color: theme.textMuted,
                marginBottom: 24,
              }),
              el.text(
                "Everything serious traders need to automate, backtest, and scale their strategies.",
                { fontSize: 16, marginBottom: 28 }
              ),
              el.list(
                [
                  "Unlimited live strategies",
                  "100K API calls per day",
                  "Advanced backtesting engine",
                  "Custom indicators & webhooks",
                  "Priority email & chat support",
                  "Premium real-time data feeds",
                ],
                { marginBottom: 32 }
              ),
              el.button("Start 14-day free trial", "/signup", {
                width: "100%",
                fontSize: 16,
                marginRight: 0,
              }),
            ]
          ),
        ]),
        col(25, [
          sideTier({
            name: "Scale",
            price: "$199",
            cadence: "per month",
            description: "For desks and teams scaling automation.",
            features: [
              "Everything in Pro",
              "Unlimited users",
              "SSO & audit logs",
              "Dedicated support",
            ],
            cta: "Contact sales",
          }),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Popular Highlight",
    description: "Three tiers with the most-popular plan visually enlarged and accented",
    category: "pricing",
    slug: "pricing-popular-highlight",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
