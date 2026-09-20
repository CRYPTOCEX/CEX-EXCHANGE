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

const pill = (value: string, label: string): Element =>
  el.card(
    {
      padding: 20,
      borderRadius: 14,
      backgroundColor: theme.bgElevated,
      boxShadowX: 0,
      boxShadowY: 12,
      boxShadowBlur: 32,
      boxShadowColor: "rgba(10,18,32,0.1)",
      borderWidth: 1,
    },
    [
      el.heading(value, {
        fontSize: 36,
        fontWeight: "700",
        letterSpacing: "-0.02em",
        color: theme.text,
        marginBottom: 4,
        level: "h3",
      }),
      el.text(label, {
        fontSize: 13,
        fontWeight: "600",
        color: theme.textMuted,
        letterSpacing: "0.06em",
        marginBottom: 0,
      }),
    ]
  );

export const statsWorldMapDots: Section = section(
  [
    singleColumnRow([
      el.text("GLOBAL COVERAGE", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("One platform, every major market", {
        textAlign: "center",
        fontSize: 44,
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Low-latency gateways in seven regions, connected to the venues where your counterparties actually trade.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "680px",
          marginBottom: 48,
        }
      ),
    ]),
    singleColumnRow([
      el.image(
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80",
        "World map showing global trading venue coverage",
        {
          width: "100%",
          height: "auto",
          borderRadius: 20,
          marginBottom: 48,
          opacity: 0.9,
        }
      ),
    ]),
    row(
      [
        col(33.33, [pill("38", "REGIONAL VENUES")]),
        col(33.33, [pill("7", "DATA CENTERS")]),
        col(33.33, [pill("<12ms", "MEDIAN LATENCY")]),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "middle" }
    ),
  ],
  {
    name: "World Map with Dots",
    description: "Heading, world map image, and three stats overlayed below",
    category: "stats",
    slug: "stats-world-map-dots",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
