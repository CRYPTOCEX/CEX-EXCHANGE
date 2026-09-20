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

export const heroSplitImageLeft: Section = section(
  [
    row(
      [
        col(50, [
          el.image(
            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
            "Analyst reviewing market analytics on multiple monitors",
            {
              borderRadius: 20,
              boxShadowX: 0,
              boxShadowY: 24,
              boxShadowBlur: 48,
              boxShadowColor: "rgba(10,18,32,0.15)",
            }
          ),
        ]),
        col(50, [
          el.text("BUILT FOR PROS", {
            fontSize: 13,
            fontWeight: "700",
            color: theme.emerald,
            letterSpacing: "0.14em",
            marginBottom: 16,
          }),
          el.heading("Trade, analyze, automate — in one canvas", {
            level: "h1",
            fontSize: 64,
            fontWeight: "800",
            letterSpacing: "-0.03em",
            lineHeight: "1.05",
            color: theme.text,
            marginBottom: 20,
          }),
          el.text(
            "Stop jumping between tabs. Pull quotes, run backtests, and fire orders from a single keystroke-driven interface.",
            {
              fontSize: 19,
              color: theme.textMuted,
              marginBottom: 32,
              lineHeight: "1.65",
              maxWidth: "520px",
            }
          ),
          el.button("Try it free", "/signup", {
            fontSize: 16,
          }),
          el.button("Talk to sales", "/contact", {
            backgroundColor: "transparent",
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            fontSize: 16,
          }),
        ]),
      ],
      { ...rowPresets.wide, gutter: 64 }
    ),
  ],
  {
    name: "Split Hero — Image Left",
    description: "50/50 split layout with image on the left and supporting copy on the right",
    category: "hero",
    slug: "hero-split-image-left",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: theme.bgSubtle,
    },
  }
);
