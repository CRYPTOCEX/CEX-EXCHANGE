import type { Section, Element, ColorValue } from "@/types/builder";
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

const tickerCard = (
  pair: string,
  price: string,
  change: string,
  volume: string,
  up: boolean
): Element =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 24,
      boxShadowX: 0,
      boxShadowY: 4,
      boxShadowBlur: 16,
      boxShadowColor: "rgba(10,18,32,0.04)",
    },
    [
      el.text(pair, {
        fontSize: 13,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.08em",
        marginBottom: 12,
      }),
      el.heading(price, {
        level: "h3",
        fontSize: 28,
        fontWeight: "800",
        letterSpacing: "-0.02em",
        color: theme.text,
        marginBottom: 8,
      }),
      el.text(change, {
        fontSize: 14,
        fontWeight: "700",
        color: up ? theme.emerald : theme.rose,
        marginBottom: 12,
      }),
      el.text(`Vol ${volume}`, {
        fontSize: 12,
        color: theme.textDim,
        marginBottom: 0,
      }),
    ]
  );

export const tradingPairTickersGrid: Section = section(
  [
    singleColumnRow([
      el.text("LIVE PRICES", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("The markets, right now", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.02em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Streaming prices from 30+ venues, aggregated into one deep order book. Updates every 100ms.",
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
        col(25, [tickerCard("BTC/USDT", "$67,284.50", "▲ 2.41%", "$1.82B", true)]),
        col(25, [tickerCard("ETH/USDT", "$3,512.80", "▲ 1.72%", "$962M", true)]),
        col(25, [tickerCard("SOL/USDT", "$184.12", "▼ 0.64%", "$428M", false)]),
        col(25, [tickerCard("BNB/USDT", "$612.45", "▲ 3.18%", "$214M", true)]),
      ],
      { ...rowPresets.wide, gutter: 20, verticalAlign: "top" }
    ),
  ],
  {
    name: "Pair Tickers Grid",
    description: "Four-column grid of live trading pair tickers with price and 24h change",
    category: "trading",
    slug: "trading-pair-tickers-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
