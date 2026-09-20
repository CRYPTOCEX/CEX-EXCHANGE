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

export const tradingRiskDisclaimer: Section = section(
  [
    singleColumnRow(
      [
        el.card(
          {
            backgroundColor: "[hsl(var(--destructive)/0.10)]",
            // `borderColor` on an element has NO class branch (see
            // `getComprehensiveElementStyle`), so an arbitrary-value fragment
            // here paints nothing and `borderWidth: 1` falls back to
            // `currentColor`. Borders take real CSS only.
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 40,
          },
          [
            el.icon("lucide:alert-triangle", {
              size: 36,
              color: theme.rose,
              marginBottom: 20,
            }),
            el.text("IMPORTANT RISK DISCLOSURE", {
              fontSize: 12,
              fontWeight: "800",
              color: theme.rose,
              letterSpacing: "0.2em",
              marginBottom: 12,
            }),
            el.heading("Trading cryptocurrency involves substantial risk", {
              level: "h2",
              fontSize: 32,
              fontWeight: "800",
              color: theme.text,
              letterSpacing: "-0.02em",
              lineHeight: "1.15",
              marginBottom: 20,
            }),
            el.text(
              "Please read this disclosure carefully before opening an account or executing any trades. By using this platform, you acknowledge and accept the risks outlined below.",
              {
                fontSize: 16,
                color: theme.textMuted,
                lineHeight: "1.7",
                marginBottom: 24,
              }
            ),
            el.list(
              [
                "<strong>Capital risk.</strong> Trading cryptocurrency, derivatives, and leveraged products involves substantial risk and may result in the loss of your invested capital. You should only trade with money you can afford to lose.",
                "<strong>Past performance.</strong> Past performance is not indicative of future results. Strategy backtests, trader leaderboards, and historical returns are illustrative only — they do not guarantee future performance.",
                "<strong>Volatility.</strong> Crypto markets operate 24/7 and can experience extreme price movements within short periods. Leveraged positions can be liquidated rapidly during periods of high volatility.",
                "<strong>Regulatory status.</strong> Crypto assets are not legal tender in most jurisdictions and may not be protected by investor-compensation schemes. Services may be unavailable to residents of certain countries including the United States, Mainland China, and OFAC-sanctioned regions.",
                "<strong>Tax obligations.</strong> You are solely responsible for determining your tax liability. Consult a qualified tax professional in your jurisdiction.",
                "<strong>No investment advice.</strong> Nothing on this platform constitutes investment, legal, or tax advice. All content is for informational purposes only.",
              ],
              { fontSize: 15, lineHeight: "1.75", marginBottom: 28 }
            ),
            el.divider({ marginTop: 16, marginBottom: 24 }),
            el.text(
              "If you do not fully understand the risks involved, please seek independent financial advice before trading. The exchange operator may at its discretion restrict access to certain products based on your residency, verification status, or risk profile.",
              {
                fontSize: 13,
                color: theme.textDim,
                lineHeight: "1.7",
                fontStyle: "italic",
                marginBottom: 16,
              }
            ),
            el.link("Read the full Terms of Service →", "/legal/terms", {
              fontSize: 14,
              fontWeight: "600",
              color: theme.primary,
            }),
          ]
        ),
      ],
      { ...rowPresets.narrow }
    ),
  ],
  {
    name: "Risk Disclaimer",
    description: "Compliance risk-disclosure section with detailed warnings",
    category: "trading",
    slug: "trading-risk-disclaimer",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
