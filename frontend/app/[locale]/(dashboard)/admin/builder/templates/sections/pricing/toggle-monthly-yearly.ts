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
      padding: 36,
    },
    [
      el.text(opts.name.toUpperCase(), {
        fontSize: 12,
        fontWeight: "700",
        color: opts.highlighted ? theme.primary : theme.textMuted,
        letterSpacing: "0.14em",
        marginBottom: 14,
      }),
      el.heading(opts.price, {
        level: "h3",
        fontSize: 52,
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

export const pricingToggleMonthlyYearly: Section = section(
  [
    singleColumnRow([
      el.heading("Save 20% with annual billing", {
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: "-0.03em",
        marginBottom: 16,
      }),
      el.text("Switch anytime. All plans include a 14-day free trial.", {
        fontSize: 17,
        textAlign: "center",
        marginBottom: 32,
      }),
    ]),
    row(
      [
        col(100, [
          el.card(
            {
              backgroundColor: theme.bgMuted,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 999,
              padding: 4,
              maxWidth: "280px",
              marginLeft: "auto",
              marginRight: "auto",
              marginBottom: 48,
              display: "inline-flex",
            },
            []
          ),
          row(
            [
              col(50, [
                el.button("Monthly", "#", {
                  width: "100%",
                  fontSize: 14,
                  backgroundColor: theme.cssSurface3,
                  color: theme.cssMutedInk,
                  paddingTop: 10,
                  paddingBottom: 10,
                  borderRadius: 999,
                  marginRight: 0,
                  marginTop: -60,
                }),
              ]),
              col(50, [
                el.button("Yearly — save 20%", "#", {
                  width: "100%",
                  fontSize: 14,
                  paddingTop: 10,
                  paddingBottom: 10,
                  borderRadius: 999,
                  marginRight: 0,
                  marginTop: -60,
                }),
              ]),
            ],
            { gutter: 4, maxWidth: "280px", marginLeft: "auto", marginRight: "auto" }
          ),
        ]),
      ],
      { ...rowPresets.narrow }
    ),
    row(
      [
        col(33.33, [
          tier({
            name: "Starter",
            price: "$15",
            cadence: "per month, billed yearly",
            description: "Everything you need to automate your first strategies.",
            features: [
              "5 live strategies",
              "Real-time data feeds",
              "Basic backtesting",
              "Email support",
            ],
            cta: "Start free trial",
          }),
        ]),
        col(33.33, [
          tier({
            name: "Pro",
            price: "$39",
            cadence: "per month, billed yearly",
            description: "For traders who want the full automation toolkit.",
            features: [
              "Unlimited strategies",
              "API access",
              "Advanced backtesting",
              "Priority support",
              "Custom indicators",
            ],
            cta: "Start free trial",
            highlighted: true,
          }),
        ]),
        col(33.33, [
          tier({
            name: "Business",
            price: "$119",
            cadence: "per month, billed yearly",
            description: "Built for small teams and proprietary desks.",
            features: [
              "Up to 10 seats",
              "SSO & audit logs",
              "Dedicated support",
              "Custom integrations",
            ],
            cta: "Contact sales",
          }),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24 }
    ),
  ],
  {
    name: "Toggle Monthly / Yearly",
    description: "Monthly/yearly toggle above three pricing tiers",
    category: "pricing",
    slug: "pricing-toggle-monthly-yearly",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
