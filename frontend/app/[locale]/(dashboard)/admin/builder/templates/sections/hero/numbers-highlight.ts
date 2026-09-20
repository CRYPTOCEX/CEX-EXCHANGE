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

const stat = (value: string, label: string, accent: string = theme.primary) => [
  el.heading(value, {
    level: "h3",
    fontSize: 52,
    fontWeight: "800",
    color: accent,
    letterSpacing: "-0.03em",
    marginBottom: 8,
    textAlign: "left",
  }),
  el.text(label, {
    fontSize: 14,
    color: theme.textMuted,
    fontWeight: "500",
    letterSpacing: "0.04em",
    marginBottom: 0,
  }),
];

export const heroNumbersHighlight: Section = section(
  [
    singleColumnRow([
      el.text("TRUSTED BY 10,000+ TEAMS", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 20,
        textAlign: "center",
      }),
      el.heading("Scale that speaks for itself", {
        level: "h1",
        fontSize: 64,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 20,
        letterSpacing: "-0.03em",
        lineHeight: "1.06",
        maxWidth: "880px",
      }),
      el.text(
        "Teams ship more, wait less, and sleep better. Here's what the platform delivers every day.",
        {
          fontSize: 19,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(25, stat("$4.2B", "Processed annually", theme.primary)),
        col(25, stat("24/7", "Markets open", theme.emerald)),
        col(25, stat("< 12ms", "P50 order latency", theme.sky)),
        col(25, stat("180+", "Markets connected", theme.violet)),
      ],
      { ...rowPresets.wide, gutter: 24 }
    ),
  ],
  {
    name: "Numbers Highlight Hero",
    description: "Centered hero paired with a four-column stats row below",
    category: "hero",
    slug: "hero-numbers-highlight",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: theme.bgBase,
    },
  }
);
