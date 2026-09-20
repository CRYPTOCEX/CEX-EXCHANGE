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

export const heroScreenshotShowcase: Section = section(
  [
    singleColumnRow([
      el.text("JUST LAUNCHED", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 20,
      }),
      el.heading("The fastest way to ship a data product", {
        level: "h1",
        fontSize: 68,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 20,
        letterSpacing: "-0.03em",
        lineHeight: "1.05",
        maxWidth: "920px",
      }),
      el.text(
        "From raw events to a live dashboard in under five minutes — no SQL, no pipelines, no glue code.",
        {
          fontSize: 20,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "680px",
          marginBottom: 32,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(100, [
          el.button("Start building", "/signup", {
            fontSize: 16,
            marginRight: 12,
          }),
          el.button("See the gallery", "/gallery", {
            backgroundColor: "transparent",
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            fontSize: 16,
          }),
        ], { textAlign: "center" }),
      ],
      { ...rowPresets.narrow, textAlign: "center", marginBottom: 16 }
    ),
    singleColumnRow(
      [
        el.image(
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=2000&q=85",
          "Product screenshot showing the analytics dashboard",
          {
            borderRadius: 20,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            boxShadowX: 0,
            boxShadowY: 40,
            boxShadowBlur: 80,
            boxShadowColor: "rgba(10,18,32,0.2)",
            marginTop: 48,
            maxWidth: "1100px",
          }
        ),
      ],
      { ...rowPresets.wide, textAlign: "center" }
    ),
  ],
  {
    name: "Screenshot Showcase Hero",
    description: "Centered heading and CTAs with a large product screenshot below",
    category: "hero",
    slug: "hero-screenshot-showcase",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: theme.bgSubtle,
    },
  }
);
