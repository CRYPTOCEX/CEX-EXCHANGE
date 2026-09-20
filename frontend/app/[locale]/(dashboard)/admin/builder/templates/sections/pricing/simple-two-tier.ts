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
      padding: 48,
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
        fontSize: 64,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        lineHeight: "1",
        marginBottom: 6,
      }),
      el.text(opts.cadence, {
        fontSize: 15,
        color: theme.textMuted,
        marginBottom: 22,
      }),
      el.text(opts.description, {
        fontSize: 16,
        marginBottom: 28,
      }),
      el.list(opts.features, { marginBottom: 32 }),
      el.button(opts.cta, "/signup", {
        width: "100%",
        fontSize: 15,
        marginRight: 0,
        // Buttons bypass the class branch entirely — `ButtonElement` puts these
        // strings straight into an inline style — so they need real CSS, not
        // the `[hsl(...)]` / bare-class-name fragments the other elements take.
        backgroundColor: opts.highlighted ? theme.cssPrimary : theme.cssSurface3,
        color: opts.highlighted ? theme.cssPrimaryInk : theme.cssForeground,
      }),
    ]
  );
}

export const pricingSimpleTwoTier: Section = section(
  [
    singleColumnRow([
      el.heading("Two ways to get started", {
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: "-0.03em",
        marginBottom: 16,
      }),
      el.text("Solo or with your team. Both plans include a 14-day free trial.", {
        fontSize: 18,
        textAlign: "center",
        marginBottom: 56,
      }),
    ]),
    row(
      [
        col(50, [
          tier({
            name: "Personal",
            price: "$19",
            cadence: "per month, for 1 user",
            description: "Everything you need to run your own strategies.",
            features: [
              "Unlimited live strategies",
              "Real-time data feeds",
              "Backtesting engine",
              "API access",
              "Email support",
            ],
            cta: "Start free trial",
          }),
        ]),
        col(50, [
          tier({
            name: "Team",
            price: "$79",
            cadence: "per month, up to 5 users",
            description: "Collaborate on strategies with shared visibility.",
            features: [
              "Everything in Personal",
              "Up to 5 team seats",
              "Shared strategy library",
              "Role-based permissions",
              "Priority email support",
            ],
            cta: "Start free trial",
            highlighted: true,
          }),
        ]),
      ],
      { ...rowPresets.narrow, gutter: 24 }
    ),
  ],
  {
    name: "Simple Two-Tier",
    description: "Minimal two-plan layout: Personal and Team side-by-side",
    category: "pricing",
    slug: "pricing-simple-two-tier",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
