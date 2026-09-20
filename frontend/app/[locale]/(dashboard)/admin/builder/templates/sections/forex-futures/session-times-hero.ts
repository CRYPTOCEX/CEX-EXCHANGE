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

const sessionCard = (
  city: string,
  localTime: string,
  utcWindow: string,
  majorPairs: string,
  color: string
): Element =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 18,
      padding: 28,
      boxShadowX: 0,
      boxShadowY: 8,
      boxShadowBlur: 24,
      boxShadowColor: "rgba(10,18,32,0.04)",
    },
    [
      el.icon("lucide:clock", { size: 28, color, marginBottom: 18 }),
      el.text(city.toUpperCase(), {
        fontSize: 11,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.16em",
        marginBottom: 10,
      }),
      el.heading(localTime, {
        level: "h3",
        fontSize: 40,
        fontWeight: "800",
        color: theme.text,
        letterSpacing: "-0.03em",
        lineHeight: "1",
        marginBottom: 12,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }),
      el.text(utcWindow, {
        fontSize: 13,
        fontWeight: "600",
        color,
        marginBottom: 16,
      }),
      el.divider({ marginTop: 0, marginBottom: 14 }),
      el.text("KEY PAIRS", {
        fontSize: 10,
        fontWeight: "700",
        color: theme.textDim,
        letterSpacing: "0.14em",
        marginBottom: 6,
      }),
      el.text(majorPairs, {
        fontSize: 13,
        color: theme.textMuted,
        marginBottom: 0,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }),
    ]
  );

export const forexFuturesSessionTimesHero: Section = section(
  [
    singleColumnRow([
      el.text("24/5 MARKETS", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.2em",
        marginBottom: 14,
      }),
      el.heading("The sun never sets on the forex market", {
        textAlign: "center",
        fontSize: 54,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        lineHeight: "1.05",
        marginBottom: 18,
        maxWidth: "900px",
      }),
      el.text(
        "Monday open Sydney through Friday close New York. Follow liquidity as it rolls west — 24 hours, five days a week.",
        {
          fontSize: 19,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "680px",
          marginBottom: 64,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(25, [sessionCard("Sydney", "07:00", "21:00 – 06:00 UTC", "AUD/USD · NZD/USD", theme.violet)]),
        col(25, [sessionCard("Tokyo", "09:00", "00:00 – 09:00 UTC", "USD/JPY · AUD/JPY", theme.rose)]),
        col(25, [sessionCard("London", "08:00", "07:00 – 16:00 UTC", "GBP/USD · EUR/USD", theme.sky)]),
        col(25, [sessionCard("New York", "03:00", "12:00 – 21:00 UTC", "EUR/USD · USD/CAD", theme.emerald)]),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Session Times Hero",
    description: "Four session cards showing local times for Sydney, Tokyo, London, and New York",
    category: "forex-futures",
    slug: "forex-futures-session-times-hero",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: theme.bgSubtle,
    },
  }
);
