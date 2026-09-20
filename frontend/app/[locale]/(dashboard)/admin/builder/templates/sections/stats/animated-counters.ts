import type { Section } from "@/types/builder";
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
import type { Element } from "@/types/builder";

const animatedCounter = (value: string, label: string): Element[] => [
  el.heading(value, {
    textAlign: "center",
    fontSize: 80,
    fontWeight: "800",
    lineHeight: "1",
    letterSpacing: "-0.03em",
    color: theme.onBand,
    marginBottom: 12,
    level: "h3",
  }),
  el.text(label, {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: theme.onBandMuted,
    letterSpacing: "0.1em",
    marginBottom: 0,
  }),
];

export const statsAnimatedCounters: Section = section(
  [
    singleColumnRow([
      el.text("BY THE NUMBERS", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.onBandMuted,
        letterSpacing: "0.14em",
        marginBottom: 16,
      }),
      el.heading("A platform traders can bet on", {
        textAlign: "center",
        fontSize: 48,
        fontWeight: "800",
        color: theme.onBand,
        letterSpacing: "-0.02em",
        marginBottom: 16,
      }),
      el.text(
        "Live counters updated hourly from production — no cherry-picked peaks.",
        {
          textAlign: "center",
          fontSize: 18,
          color: theme.onBandMuted,
          maxWidth: "620px",
          marginBottom: 64,
        }
      ),
    ]),
    row(
      [
        col(25, animatedCounter("$2.4B", "DAILY VOLUME")),
        col(25, animatedCounter("240K", "ACTIVE TRADERS")),
        col(25, animatedCounter("150+", "TRADING PAIRS")),
        col(25, animatedCounter("24/7", "MARKETS")),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Animated Counters",
    description: "Counters with eyebrow, heading, and sub on a featured gradient wrapper",
    category: "stats",
    slug: "stats-animated-counters",
    type: "fullwidth",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: gradients.indigoViolet,
    },
  }
);
