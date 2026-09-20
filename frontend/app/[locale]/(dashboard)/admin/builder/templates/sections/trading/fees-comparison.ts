import type { Section, Row } from "@/types/builder";
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

const feeRow = (tier: string, volume: string, maker: string, taker: string, withdrawal: string): Row =>
  row(
    [
      col(25, [
        el.text(tier, {
          fontSize: 15,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 2,
        }),
        el.text(volume, {
          fontSize: 12,
          color: theme.textDim,
          marginBottom: 0,
        }),
      ]),
      col(25, [
        el.text(maker, {
          fontSize: 16,
          fontWeight: "600",
          color: theme.emerald,
          textAlign: "center",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ], { textAlign: "center" }),
      col(25, [
        el.text(taker, {
          fontSize: 16,
          fontWeight: "600",
          color: theme.sky,
          textAlign: "center",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ], { textAlign: "center" }),
      col(25, [
        el.text(withdrawal, {
          fontSize: 16,
          fontWeight: "600",
          color: theme.text,
          textAlign: "center",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ], { textAlign: "center" }),
    ],
    {
      ...rowPresets.contained,
      gutter: 16,
      paddingTop: 18,
      paddingBottom: 18,
      borderBottom: true,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      verticalAlign: "middle",
    }
  );

export const tradingFeesComparison: Section = section(
  [
    singleColumnRow([
      el.text("FEE SCHEDULE", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("Transparent fees. No hidden spreads.", {
        textAlign: "center",
        fontSize: 46,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "Your 30-day rolling volume unlocks your tier automatically. Fee tier upgrades apply instantly.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 56,
        }
      ),
    ]),
    // Header
    row(
      [
        col(25, [
          el.text("TIER", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            marginBottom: 0,
          }),
        ]),
        col(25, [
          el.text("MAKER", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.emerald,
            letterSpacing: "0.12em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]),
        col(25, [
          el.text("TAKER", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.sky,
            letterSpacing: "0.12em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]),
        col(25, [
          el.text("WITHDRAWAL (BTC)", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]),
      ],
      {
        ...rowPresets.contained,
        gutter: 16,
        paddingTop: 18,
        paddingBottom: 18,
        backgroundColor: theme.bgMuted,
        borderRadius: 12,
        verticalAlign: "middle",
      }
    ),
    feeRow("Retail", "< $100K / 30d", "0.10%", "0.15%", "0.0005 BTC"),
    feeRow("Advanced", "$100K – $1M", "0.08%", "0.12%", "0.0004 BTC"),
    feeRow("Pro", "$1M – $10M", "0.05%", "0.08%", "0.0003 BTC"),
    feeRow("VIP", "$10M – $50M", "0.02%", "0.05%", "0.0002 BTC"),
    feeRow("Institutional", "> $50M / 30d", "0.00%", "0.02%", "Negotiated"),
    singleColumnRow(
      [
        el.text(
          "All fees quoted in USD-equivalent. Maker rebates available for Pro and above. Contact our desk for OTC pricing.",
          {
            fontSize: 13,
            color: theme.textDim,
            marginTop: 32,
            textAlign: "center",
            marginBottom: 0,
          }
        ),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Fees Comparison",
    description: "Tiered fee schedule table with maker, taker, and withdrawal fees",
    category: "trading",
    slug: "trading-fees-comparison",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
