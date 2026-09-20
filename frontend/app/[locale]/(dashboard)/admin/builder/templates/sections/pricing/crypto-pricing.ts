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
      boxShadowY: opts.highlighted ? 28 : 8,
      boxShadowBlur: opts.highlighted ? 56 : 24,
      boxShadowSpread: -14,
      boxShadowColor: opts.highlighted
        ? "rgba(31,113,235,0.4)"
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
        fontSize: 52,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        lineHeight: "1",
        marginBottom: 4,
      }),
      el.text(opts.cadence, {
        fontSize: 14,
        color: theme.textMuted,
        marginBottom: 22,
      }),
      el.text(opts.description, {
        fontSize: 15,
        color: theme.textMuted,
        marginBottom: 24,
      }),
      el.list(opts.features, { fontSize: 14, marginBottom: 28 }),
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

export const pricingCryptoPricing: Section = section(
  [
    singleColumnRow([
      el.text("EXCHANGE TIERS", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 16,
      }),
      el.heading("Fees that reward your volume", {
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: "-0.03em",
        marginBottom: 16,
      }),
      el.text(
        "Tight spreads, transparent fees, and real API limits. Upgrade tier as your 30-day volume grows.",
        {
          fontSize: 18,
          textAlign: "center",
          marginBottom: 56,
          maxWidth: "660px",
          marginLeft: "auto",
          marginRight: "auto",
        }
      ),
    ]),
    row(
      [
        col(33.33, [
          tier({
            name: "Basic",
            price: "0.10% / 0.15%",
            cadence: "maker / taker",
            description: "For new traders getting comfortable with the markets.",
            features: [
              "100 API calls / sec",
              "Withdrawals up to 50K USDT / day",
              "Spot & margin trading",
              "Mobile + web access",
              "Email support",
            ],
            cta: "Create account",
          }),
        ]),
        col(33.33, [
          tier({
            name: "Trader",
            price: "0.05% / 0.08%",
            cadence: "maker / taker",
            description: "For active traders with consistent monthly volume.",
            features: [
              "500 API calls / sec",
              "Withdrawals up to 500K USDT / day",
              "Perpetual futures access",
              "Advanced order types (TWAP, iceberg)",
              "24/7 priority chat support",
            ],
            cta: "Upgrade to Trader",
            highlighted: true,
          }),
        ]),
        col(33.33, [
          tier({
            name: "Institutional",
            price: "0.01% / 0.03%",
            cadence: "maker / taker",
            description: "For funds and market makers with material flow.",
            features: [
              "2,500 API calls / sec",
              "Unlimited withdrawals",
              "Institutional API access",
              "Sub-account hierarchy",
              "Dedicated prime broker",
              "Custom OTC & RFQ desk",
            ],
            cta: "Contact desk",
          }),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24 }
    ),
  ],
  {
    name: "Crypto Pricing",
    description: "Three-tier exchange fee schedule with crypto-specific feature sets",
    category: "pricing",
    slug: "pricing-crypto-pricing",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
