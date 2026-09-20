import type { Section, Element } from "@/types/builder";
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

const spreadCard = (
  label: string,
  value: string,
  unit: string,
  description: string,
  highlighted: boolean,
  tag?: string
): Element =>
  el.card(
    {
      backgroundColor: highlighted ? theme.primarySoft : theme.bgCard,
      borderColor: highlighted ? theme.primary : theme.border,
      borderWidth: highlighted ? 2 : 1,
      borderRadius: 20,
      padding: 40,
      boxShadowX: 0,
      boxShadowY: highlighted ? 24 : 8,
      boxShadowBlur: highlighted ? 48 : 20,
      boxShadowSpread: -10,
      boxShadowColor: highlighted
        ? "rgba(31,113,235,0.4)"
        : "rgba(10,18,32,0.04)",
    },
    [
      ...(tag
        ? [
            el.text(tag, {
              fontSize: 11,
              fontWeight: "800",
              color: theme.primary,
              letterSpacing: "0.16em",
              marginBottom: 14,
            }),
          ]
        : []),
      el.text(label.toUpperCase(), {
        fontSize: 12,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.14em",
        marginBottom: 14,
      }),
      el.heading(value, {
        level: "h3",
        fontSize: 64,
        fontWeight: "800",
        color: highlighted ? theme.primary : theme.text,
        letterSpacing: "-0.04em",
        lineHeight: "1",
        marginBottom: 6,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }),
      el.text(unit, {
        fontSize: 14,
        color: theme.textMuted,
        fontWeight: "600",
        marginBottom: 20,
      }),
      el.text(description, {
        fontSize: 14,
        color: theme.textMuted,
        lineHeight: "1.6",
        marginBottom: 0,
      }),
    ]
  );

export const forexFuturesSpreadComparison: Section = section(
  [
    singleColumnRow([
      el.text("EUR/USD SPREADS", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("Our spreads, measured against the market", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "Typical EUR/USD spread at London–New York overlap. Measured over 30 days, published transparently.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "660px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(33.33, [
          spreadCard(
            "Our spread",
            "0.0",
            "pips — Raw ECN account",
            "Zero-markup institutional pricing passed straight to your terminal. $3.50 commission per lot.",
            true,
            "BEST IN CLASS"
          ),
        ]),
        col(33.33, [
          spreadCard(
            "Industry average",
            "0.8",
            "pips — broker average",
            "Typical retail broker spread on EUR/USD at peak liquidity. No commission, wider markup.",
            false
          ),
        ]),
        col(33.33, [
          spreadCard(
            "Legacy broker",
            "1.6",
            "pips — dealing desk",
            "Dealing-desk brokers add significant markup and often requote during volatility.",
            false
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
    singleColumnRow(
      [
        el.text(
          // Raw HTML `style` — real CSS, so the token goes in directly (this is
          // not one of the settings the renderer routes through its class test).
          `Cost savings of <strong style="color:${theme.cssSuccess};">~$160 per standard lot traded</strong> versus the industry average.`,
          {
            fontSize: 15,
            color: theme.textMuted,
            textAlign: "center",
            marginTop: 40,
            marginBottom: 0,
          }
        ),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Spread Comparison",
    description: "Three-column spread comparison: ours vs industry vs legacy broker",
    category: "forex-futures",
    slug: "forex-futures-spread-comparison",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
