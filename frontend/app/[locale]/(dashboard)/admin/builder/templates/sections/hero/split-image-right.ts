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

export const heroSplitImageRight: Section = section(
  [
    row(
      [
        col(50, [
          el.text("PRODUCT", {
            fontSize: 13,
            fontWeight: "700",
            color: theme.primary,
            letterSpacing: "0.14em",
            marginBottom: 16,
          }),
          el.heading("Where traders move faster", {
            level: "h1",
            fontSize: 64,
            fontWeight: "800",
            letterSpacing: "-0.03em",
            lineHeight: "1.05",
            color: theme.text,
            marginBottom: 20,
          }),
          el.text(
            "Execute trades, run strategies, and monitor risk — all from one keyboard-first workspace designed for the serious pro.",
            {
              fontSize: 19,
              color: theme.textMuted,
              marginBottom: 32,
              lineHeight: "1.65",
              maxWidth: "520px",
            }
          ),
          el.button("Get started", "/signup", {
            fontSize: 16,
          }),
          el.button("See live demo", "/demo", {
            backgroundColor: "transparent",
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            fontSize: 16,
          }),
        ]),
        col(50, [
          el.image(
            "https://images.unsplash.com/photo-1642790551116-18e150f248e3?w=1200&q=80",
            "Trading dashboard with real-time market charts",
            {
              borderRadius: 20,
              boxShadowX: 0,
              boxShadowY: 24,
              boxShadowBlur: 48,
              boxShadowColor: "rgba(10,18,32,0.15)",
            }
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 64 }
    ),
  ],
  {
    name: "Split Hero — Image Right",
    description: "50/50 split layout with copy on the left and product image on the right",
    category: "hero",
    slug: "hero-split-image-right",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: theme.bgBase,
    },
  }
);
