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

export const aboutSplitImageStory: Section = section(
  [
    row(
      [
        col(50, [
          el.text("OUR STORY", {
            fontSize: 13,
            fontWeight: "700",
            color: theme.primary,
            letterSpacing: "0.14em",
            marginBottom: 16,
          }),
          el.heading("Built by traders, for traders since 2018", {
            fontSize: 48,
            fontWeight: "800",
            letterSpacing: "-0.03em",
            lineHeight: "1.1",
            marginBottom: 20,
          }),
          el.text(
            "We started in a small office in Singapore with three engineers, one mandate, and a belief that execution should not be a premium feature. Seven years later, that belief is still the measuring stick for every decision we make.",
            { fontSize: 18, marginBottom: 16 }
          ),
          el.text(
            "Today more than 180,000 traders across forty-two countries route flow through our stack. We remain privately held, engineer-led, and obsessed with the millisecond.",
            { fontSize: 18, marginBottom: 32 }
          ),
          el.button("Meet the team", "/team", { fontSize: 16 }),
          el.button("Read the manifesto", "/manifesto", {
            backgroundColor: theme.cssSurface3,
            color: theme.cssForeground,
            fontSize: 16,
          }),
        ]),
        col(50, [
          el.image(
            "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
            "Our founding team collaborating in the original Singapore office",
            {
              width: "100%",
              height: "auto",
              borderRadius: 20,
              boxShadowX: 0,
              boxShadowY: 24,
              boxShadowBlur: 48,
              boxShadowSpread: -12,
              boxShadowColor: "rgba(10,18,32,0.15)",
            }
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 48 }
    ),
  ],
  {
    name: "Split Image Story",
    description: "Copy on the left, photo on the right",
    category: "about",
    slug: "about-split-image-story",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
