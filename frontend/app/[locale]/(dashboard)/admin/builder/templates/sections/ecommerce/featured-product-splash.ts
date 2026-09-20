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

export const ecommerceFeaturedProductSplash: Section = section(
  [
    row(
      [
        col(
          55,
          [
            el.image(
              "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1400&q=85",
              "Pair of minimal leather sneakers on marble surface",
              {
                borderRadius: 24,
                width: "100%",
                height: "auto",
                boxShadowX: 0,
                boxShadowY: 40,
                boxShadowBlur: 80,
                boxShadowColor: "rgba(10,18,32,0.15)",
              }
            ),
          ]
        ),
        col(45, [
          el.text("LIMITED DROP", {
            fontSize: 12,
            fontWeight: "800",
            color: theme.primary,
            letterSpacing: "0.22em",
            marginBottom: 16,
          }),
          el.heading("The Orion Leather Sneaker", {
            level: "h2",
            fontSize: 48,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 18,
            letterSpacing: "-0.03em",
            lineHeight: "1.1",
          }),
          el.text(
            "Hand-stitched in Portugal from full-grain calfskin. Cushioned arch, vulcanized rubber outsole, and a silhouette that goes with everything.",
            {
              fontSize: 17,
              color: theme.textMuted,
              marginBottom: 28,
              lineHeight: "1.65",
            }
          ),
          el.list(
            [
              "Full-grain leather upper",
              "Memory-foam insole",
              "Free 60-day returns",
              "Ships within 2 business days",
            ],
            {
              fontSize: 15,
              color: theme.text,
              marginBottom: 32,
              listStyle: "check",
            }
          ),
          el.heading("$248.00", {
            level: "h3",
            fontSize: 36,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 20,
            letterSpacing: "-0.02em",
          }),
          el.button("Add to bag", "/shop/orion", {
            backgroundColor: theme.cssPrimary,
            color: theme.cssPrimaryInk,
            fontSize: 16,
            paddingLeft: 36,
            paddingRight: 36,
            marginRight: 12,
          }),
          el.button("View details", "/shop/orion/details", {
            backgroundColor: theme.cssSurface3,
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            marginRight: 0,
          }),
        ], { paddingLeft: 24 }),
      ],
      { ...rowPresets.wide, gutter: 48, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Featured Product Splash",
    description: "Large featured product card with image, copy, spec list, and CTAs",
    category: "ecommerce",
    slug: "ecommerce-featured-product-splash",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
