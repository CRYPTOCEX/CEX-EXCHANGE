import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

const stat = (
  value: string,
  label: string,
  accent: string
) =>
  col(100, [
    el.heading(value, {
      level: "h3",
      fontSize: 52,
      fontWeight: "800",
      color: accent,
      textAlign: "center",
      letterSpacing: "-0.03em",
      lineHeight: "1",
      marginBottom: 10,
    }),
    el.text(label, {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: "center",
      fontWeight: "500",
      letterSpacing: "0.04em",
      marginBottom: 0,
    }),
  ]);

export const p2pStatsBar: Section = section(
  [
    row(
      [
        stat("$3.8B", "Total P2P volume", theme.emerald),
        stat("2M+", "Trades completed", theme.primary),
        stat("190+", "Countries supported", theme.sky),
        stat("100+", "Payment methods", theme.amber),
        stat("4.9/5", "Average merchant rating", theme.violet),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "P2P Stats Bar",
    description: "Row of 5 headline P2P stats (volume, trades, countries, methods, rating)",
    category: "p2p",
    slug: "p2p-stats-bar",
    settings: {
      ...sectionPresets.compact,
      backgroundColor: theme.bgSubtle,
    },
  }
);
