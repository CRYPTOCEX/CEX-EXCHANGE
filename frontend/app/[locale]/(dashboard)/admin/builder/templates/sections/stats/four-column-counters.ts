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
import type { Element } from "@/types/builder";

const counter = (value: string, label: string, accent?: any): Element[] => [
  el.heading(value, {
    textAlign: "center",
    fontSize: 72,
    fontWeight: "700",
    lineHeight: "1.05",
    letterSpacing: "-0.03em",
    color: accent ?? theme.text,
    marginBottom: 8,
    level: "h3",
  }),
  el.text(label, {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: theme.textMuted,
    letterSpacing: "0.06em",
    marginBottom: 0,
  }),
];

export const statsFourColumnCounters: Section = section(
  [
    row(
      [
        col(25, counter("$2.4B", "DAILY VOLUME")),
        col(25, counter("240K", "ACTIVE TRADERS")),
        col(25, counter("150+", "TRADING PAIRS")),
        col(25, counter("24/7", "MARKETS")),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Four-Column Counters",
    description: "Four big numbers in a row with short labels",
    category: "stats",
    slug: "stats-four-column-counters",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
