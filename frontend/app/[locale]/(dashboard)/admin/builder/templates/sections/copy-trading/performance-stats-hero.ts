import type { Section, Element } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  gradients,
  sectionPresets,
  rowPresets,
} from "../../utils";

const statTile = (value: string, label: string, sub: string): Element =>
  el.card(
    {
      backgroundColor: theme.onBandFill,
      borderColor: theme.onBandFill,
      borderWidth: 1,
      borderRadius: 18,
      padding: 32,
      textAlign: "center",
    },
    [
      el.heading(value, {
        level: "h3",
        fontSize: 56,
        fontWeight: "800",
        // Pinned ink: the hero ground is a deliberate dark band, so a
        // theme-following accent would go dark-on-dark in light mode.
        color: theme.onBand,
        letterSpacing: "-0.035em",
        lineHeight: "1",
        textAlign: "center",
        marginBottom: 10,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }),
      el.text(label, {
        fontSize: 12,
        fontWeight: "800",
        color: theme.onBand,
        letterSpacing: "0.16em",
        textAlign: "center",
        marginBottom: 6,
      }),
      el.text(sub, {
        fontSize: 13,
        color: theme.onBandDim,
        textAlign: "center",
        marginBottom: 0,
      }),
    ]
  );

export const copyTradingPerformanceStatsHero: Section = section(
  [
    singleColumnRow([
      el.text("PLATFORM-WIDE PERFORMANCE", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.onBandMuted,
        letterSpacing: "0.2em",
        marginBottom: 20,
      }),
      el.heading("Real returns from real traders", {
        level: "h1",
        fontSize: 64,
        fontWeight: "800",
        textAlign: "center",
        color: theme.onBand,
        letterSpacing: "-0.035em",
        lineHeight: "1.04",
        marginBottom: 20,
        maxWidth: "900px",
      }),
      el.text(
        "The aggregate performance of 4,200+ verified strategy providers and 840,000 copiers, streamed live from our trading engine.",
        {
          fontSize: 20,
          textAlign: "center",
          color: theme.onBandMuted,
          maxWidth: "720px",
          marginBottom: 64,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(25, [
          statTile("+38.4%", "AVG ANNUAL ROI", "Across all top-tier providers"),
        ]),
        col(25, [
          statTile("+184%", "TOP 30D ROI", "Best performer in April 2026"),
        ]),
        col(25, [
          statTile("840K", "ACTIVE COPIERS", "Paying real capital, right now"),
        ]),
        col(25, [
          statTile("$2.4B", "COPIED VOLUME / MO", "Traded via copy positions"),
        ]),
      ],
      { ...rowPresets.wide, gutter: 20, verticalAlign: "top", marginBottom: 40 }
    ),
    row(
      [
        col(100, [
          el.button("Start copying now", "/copy-trading", {
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            fontSize: 16,
            paddingLeft: 32,
            paddingRight: 32,
            marginRight: 12,
          }),
          el.button("See leaderboard", "/copy-trading/leaderboard", {
            backgroundColor: theme.onBandFill,
            color: theme.onBand,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.onBandBorder,
            fontSize: 16,
          }),
        ], { textAlign: "center" }),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Performance Stats Hero",
    description: "Aggregate copy-trading stats hero: avg ROI, top ROI, active copiers, volume",
    category: "copy-trading",
    slug: "copy-trading-performance-stats-hero",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: gradients.aurora,
    },
  }
);
