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
import type { Element, ColorValue } from "@/types/builder";

const tradingCard = (
  value: string,
  label: string,
  delta: string,
  deltaColor: ColorValue,
): Element =>
  el.card(
    {
      padding: 32,
      borderRadius: 18,
      backgroundColor: theme.bgElevated,
      borderColor: theme.border,
      borderWidth: 1,
    },
    [
      el.text(label, {
        fontSize: 12,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading(value, {
        fontSize: 44,
        fontWeight: "700",
        letterSpacing: "-0.02em",
        color: theme.text,
        marginBottom: 8,
        level: "h3",
      }),
      el.text(delta, {
        fontSize: 13,
        fontWeight: "600",
        color: deltaColor,
        marginBottom: 0,
      }),
    ]
  );

export const statsTradingStats: Section = section(
  [
    singleColumnRow([
      el.text("LIVE MARKET STATS", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("A trading engine, measured honestly", {
        textAlign: "center",
        fontSize: 44,
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Volume, users, pairs, and uptime — all pulled live from the platform.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 48,
        }
      ),
    ]),
    row(
      [
        col(25, [tradingCard("$2.4B", "24H VOLUME", "▲ 8.2% vs 7-day avg", theme.emerald)]),
        col(25, [tradingCard("240K", "ACTIVE TRADERS", "▲ 12.4% this month", theme.emerald)]),
        col(25, [tradingCard("150+", "TRADING PAIRS", "12 new pairs this quarter", theme.sky)]),
        col(25, [tradingCard("24/7", "MARKETS OPEN", "Every day of the year", theme.emerald)]),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Trading Stats",
    description: "Four live trading metrics: volume, users, pairs, and uptime",
    category: "stats",
    slug: "stats-trading-stats",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
