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

const miniCard = (
  image: string,
  category: string,
  title: string,
  author: string,
  date: string
) =>
  col(50, [
    el.image(image, title, {
      width: "100%",
      height: "160px",
      objectFit: "cover",
      borderRadius: 12,
      marginBottom: 14,
    }),
    el.text(category, {
      fontSize: 11,
      fontWeight: "700",
      color: theme.primary,
      letterSpacing: "0.15em",
      marginBottom: 8,
    }),
    el.heading(title, {
      level: "h3",
      fontSize: 17,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 8,
      letterSpacing: "-0.01em",
      lineHeight: "1.3",
    }),
    el.text(`${author} · ${date}`, {
      fontSize: 12,
      color: theme.textDim,
      marginBottom: 0,
    }),
  ]);

export const blogFeaturedPlusGrid: Section = section(
  [
    singleColumnRow([
      el.heading("The latest from our team", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "left",
        color: theme.text,
        marginBottom: 56,
        letterSpacing: "-0.03em",
      }),
    ]),
    row(
      [
        col(55, [
          el.image(
            "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=80",
            "Why execution speed matters for scalping",
            {
              width: "100%",
              height: "380px",
              objectFit: "cover",
              borderRadius: 20,
              marginBottom: 24,
            }
          ),
          el.text("FEATURED · RESEARCH", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.primary,
            letterSpacing: "0.2em",
            marginBottom: 14,
          }),
          el.heading("Why execution speed matters for scalping", {
            level: "h3",
            fontSize: 34,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 14,
            letterSpacing: "-0.03em",
            lineHeight: "1.15",
          }),
          el.text(
            "Slippage compounds at high frequency. In this piece we reconstruct one trader's year — and show where every lost millisecond ended up on the P&L.",
            {
              fontSize: 17,
              lineHeight: "1.65",
              color: theme.textMuted,
              marginBottom: 14,
            }
          ),
          el.text("Maya Chen · Apr 18 · 7 min read", {
            fontSize: 13,
            color: theme.textDim,
            marginBottom: 0,
          }),
        ]),
        {
          ...col(45, []),
          rows: [
            row(
              [
                miniCard(
                  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80",
                  "STRATEGY",
                  "Building a delta-neutral options portfolio",
                  "Jordan Park",
                  "Apr 14"
                ),
                miniCard(
                  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&q=80",
                  "DEFI",
                  "A field guide to DeFi lending protocols",
                  "Samir Patel",
                  "Apr 09"
                ),
              ],
              { gutter: 20, maxWidth: "100%", verticalAlign: "top" }
            ),
            row(
              [
                miniCard(
                  "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=600&q=80",
                  "MACRO",
                  "The yield curve and what it's telling us now",
                  "Lena Rossi",
                  "Apr 04"
                ),
                miniCard(
                  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80",
                  "QUANT",
                  "A simpler factor model beats a complex one",
                  "Taro Yamada",
                  "Mar 30"
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
    name: "Featured + Grid Blog",
    description: "One large featured story paired with a 2x2 grid of supporting posts",
    category: "blog",
    slug: "blog-featured-plus-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
