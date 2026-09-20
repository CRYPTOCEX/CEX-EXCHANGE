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

export const ctaSplitImage: Section = section(
  [
    row(
      [
        col(50, [
          el.text("FOR ACTIVE TRADERS", {
            fontSize: 13,
            fontWeight: "700",
            color: theme.primary,
            letterSpacing: "0.08em",
            marginBottom: 16,
          }),
          el.heading("Built for institutional-grade performance", {
            fontSize: 48,
            fontWeight: "800",
            letterSpacing: "-0.03em",
            lineHeight: "1.1",
            marginBottom: 20,
          }),
          el.text(
            "A matching engine you own, a documented API, and transparent fee tiers. Everything serious traders expect, without the legacy complexity.",
            { fontSize: 18, marginBottom: 32 }
          ),
          el.button("Open an account", "/signup", { fontSize: 16 }),
          el.button("View documentation", "/docs", {
            backgroundColor: theme.cssSurface3,
            color: theme.cssForeground,
            fontSize: 16,
          }),
        ]),
        col(50, [
          el.image(
            "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=80",
            "Trading dashboard illustration",
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
    name: "Split Image CTA",
    description: "50/50 layout with copy and dual CTA on the left, product image on the right",
    category: "cta",
    slug: "cta-split-image",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
