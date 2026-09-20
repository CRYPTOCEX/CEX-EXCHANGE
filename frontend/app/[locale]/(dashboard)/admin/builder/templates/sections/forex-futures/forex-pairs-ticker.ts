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

const pipCard = (pair: string, price: string, change: string, pips: string, up: boolean): Element =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 20,
    },
    [
      el.text(pair, {
        fontSize: 13,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.08em",
        marginBottom: 8,
      }),
      el.heading(price, {
        level: "h4",
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: "-0.02em",
        color: theme.text,
        marginBottom: 6,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }),
      el.text(
        `<span style="color:${up ? "#10b981" : "#ef4444"};font-weight:700;">${change}</span>&nbsp;&nbsp;<span style="color:#71717a;">${pips}</span>`,
        {
          fontSize: 13,
          marginBottom: 0,
        }
      ),
    ]
  );

export const forexFuturesForexPairsTicker: Section = section(
  [
    singleColumnRow([
      el.text("MAJOR FOREX PAIRS", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("Every major pair. Tight spreads. 24/5.", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "Institutional liquidity from tier-1 banks, streamed directly into your terminal with zero requotes.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(16.66, [pipCard("EUR/USD", "1.08742", "+0.18%", "+19 pips", true)]),
        col(16.66, [pipCard("GBP/USD", "1.26518", "+0.24%", "+30 pips", true)]),
        col(16.66, [pipCard("USD/JPY", "154.382", "-0.12%", "-18 pips", false)]),
        col(16.66, [pipCard("AUD/USD", "0.65421", "+0.08%", "+5 pips", true)]),
        col(16.66, [pipCard("USD/CHF", "0.91248", "-0.21%", "-19 pips", false)]),
        col(16.66, [pipCard("USD/CAD", "1.37821", "+0.31%", "+42 pips", true)]),
      ],
      { ...rowPresets.wide, gutter: 14, verticalAlign: "top" }
    ),
    singleColumnRow(
      [
        el.text(
          "Spreads from 0.0 pips on EUR/USD at peak liquidity • No dealing desk • STP/ECN execution",
          {
            fontSize: 13,
            color: theme.textDim,
            textAlign: "center",
            marginTop: 32,
            marginBottom: 0,
          }
        ),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Forex Pairs Ticker",
    description: "Six major forex pair tickers with pip movement",
    category: "forex-futures",
    slug: "forex-futures-forex-pairs-ticker",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
