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

const miniStat = (value: string, label: string): Element[] => [
  el.heading(value, {
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: "-0.02em",
    color: theme.text,
    marginBottom: 6,
    level: "h3",
  }),
  el.text(label, {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textMuted,
    letterSpacing: "0.06em",
    marginBottom: 0,
  }),
];

export const statsGrowthChart: Section = section(
  [
    singleColumnRow([
      el.text("GROWTH", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Volume that keeps climbing", {
        textAlign: "center",
        fontSize: 44,
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Quarterly notional volume cleared on the platform since launch.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 48,
        }
      ),
    ]),
    singleColumnRow([
      el.image(
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&q=80",
        "Line chart showing quarterly trading volume growth",
        {
          width: "100%",
          height: "auto",
          borderRadius: 20,
          marginBottom: 48,
        }
      ),
    ]),
    row(
      [
        col(33.33, miniStat("3.2×", "VOLUME YoY")),
        col(33.33, miniStat("+148K", "NEW TRADERS THIS YEAR")),
        col(33.33, miniStat("$87B", "LIFETIME CLEARED")),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Growth Chart",
    description: "Heading, a chart image placeholder, and three stats below",
    category: "stats",
    slug: "stats-growth-chart",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
