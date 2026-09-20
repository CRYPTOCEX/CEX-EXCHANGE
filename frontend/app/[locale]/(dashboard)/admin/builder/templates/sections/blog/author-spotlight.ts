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

const authorArticle = (
  image: string,
  title: string,
  excerpt: string,
  date: string
) =>
  col(33.33, [
    el.image(image, title, {
      width: "100%",
      height: "180px",
      objectFit: "cover",
      borderRadius: 12,
      marginBottom: 16,
    }),
    el.heading(title, {
      level: "h3",
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 10,
      letterSpacing: "-0.01em",
      lineHeight: "1.3",
    }),
    el.text(excerpt, {
      fontSize: 14,
      lineHeight: "1.6",
      color: theme.textMuted,
      marginBottom: 10,
    }),
    el.text(date, {
      fontSize: 12,
      color: theme.textDim,
      marginBottom: 0,
    }),
  ]);

export const blogAuthorSpotlight: Section = section(
  [
    row(
      [
        col(
          35,
          [
            el.image(
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80",
              "Maya Chen",
              {
                width: "120px",
                height: "120px",
                objectFit: "cover",
                borderRadius: 999,
                marginBottom: 24,
              }
            ),
            el.text("AUTHOR SPOTLIGHT", {
              fontSize: 11,
              fontWeight: "700",
              color: theme.primary,
              letterSpacing: "0.22em",
              marginBottom: 12,
            }),
            el.heading("Maya Chen", {
              level: "h2",
              fontSize: 36,
              fontWeight: "800",
              color: theme.text,
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }),
            el.text("Lead Research, Markets", {
              fontSize: 15,
              fontWeight: "500",
              color: theme.textMuted,
              marginBottom: 16,
            }),
            el.text(
              "Former quant at a Chicago market-maker, now writing about the mechanics of modern market structure — from fee tiers to order types.",
              {
                fontSize: 15,
                lineHeight: "1.65",
                color: theme.textMuted,
                marginBottom: 20,
              }
            ),
            el.link("See all of Maya's posts →", "#", {
              fontSize: 14,
              fontWeight: "600",
              color: theme.primary,
            }),
          ],
          {
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 20,
            paddingTop: 40,
            paddingBottom: 40,
            paddingLeft: 36,
            paddingRight: 36,
          }
        ),
        {
          ...col(65, []),
          rows: [
            row(
              [
                authorArticle(
                  "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&q=80",
                  "Why execution speed matters for scalping",
                  "A full year of trades, rebuilt tick by tick.",
                  "Apr 18"
                ),
                authorArticle(
                  "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80",
                  "Order types, explained for builders",
                  "What you get for $15k/mo of rack space.",
                  "Mar 26"
                ),
                authorArticle(
                  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80",
                  "Reading an order book without lying to yourself",
                  "Five biases that will cost you money.",
                  "Mar 12"
                ),
              ],
              { gutter: 20, maxWidth: "100%", verticalAlign: "top" }
            ),
            row(
              [
                authorArticle(
                  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80",
                  "The tick size debate, revisited",
                  "Smaller ticks aren't always better for retail.",
                  "Feb 28"
                ),
                authorArticle(
                  "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=600&q=80",
                  "How we think about slippage internally",
                  "The invisible tax on every trade.",
                  "Feb 14"
                ),
                authorArticle(
                  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&q=80",
                  "A note on latency arbitrage",
                  "Why it's mostly not what you think.",
                  "Feb 02"
                ),
              ],
              { gutter: 20, maxWidth: "100%", verticalAlign: "top" }
            ),
          ],
        },
      ],
      { ...rowPresets.wide, gutter: 40, verticalAlign: "top" }
    ),
  ],
  {
    name: "Author Spotlight",
    description: "Featured author panel with portrait and bio beside their recent articles",
    category: "blog",
    slug: "blog-author-spotlight",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
