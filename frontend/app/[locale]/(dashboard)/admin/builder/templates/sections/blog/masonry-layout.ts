import type { Section, Column } from "@/types/builder";
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

const tile = (
  image: string,
  imageHeight: string,
  category: string,
  title: string,
  author: string,
  date: string
) => [
  el.image(image, title, {
    width: "100%",
    height: imageHeight,
    objectFit: "cover",
    borderRadius: 14,
    marginBottom: 16,
  }),
  el.text(category, {
    fontSize: 11,
    fontWeight: "700",
    color: theme.primary,
    letterSpacing: "0.18em",
    marginBottom: 8,
  }),
  el.heading(title, {
    level: "h3",
    fontSize: 20,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 10,
    letterSpacing: "-0.01em",
    lineHeight: "1.3",
  }),
  el.text(`${author} · ${date}`, {
    fontSize: 12,
    color: theme.textDim,
    marginBottom: 28,
  }),
];

export const blogMasonryLayout: Section = section(
  [
    singleColumnRow([
      el.heading("A gallery of recent reads", {
        level: "h2",
        fontSize: 42,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "An asymmetric layout that lets each story breathe at its own size.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          marginBottom: 56,
          maxWidth: "560px",
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(33.33, [
          ...tile(
            "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80",
            "260px",
            "RESEARCH",
            "Why execution speed matters for scalping",
            "Maya Chen",
            "Apr 18"
          ),
          ...tile(
            "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=800&q=80",
            "180px",
            "MACRO",
            "The yield curve, re-examined",
            "Lena Rossi",
            "Apr 04"
          ),
        ]),
        col(33.33, [
          ...tile(
            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
            "200px",
            "STRATEGY",
            "Building a delta-neutral options portfolio",
            "Jordan Park",
            "Apr 14"
          ),
          ...tile(
            "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
            "280px",
            "QUANT",
            "A simpler factor model beats a complex one",
            "Taro Yamada",
            "Mar 30"
          ),
        ]),
        col(33.33, [
          ...tile(
            "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80",
            "240px",
            "DEFI",
            "A field guide to DeFi lending protocols",
            "Samir Patel",
            "Apr 09"
          ),
          ...tile(
            "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80",
            "180px",
            "INFRASTRUCTURE",
            "Order types, explained for builders",
            "Maya Chen",
            "Mar 26"
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 28, verticalAlign: "top" }
    ),
  ],
  {
    name: "Masonry Blog Layout",
    description: "Asymmetric tiled grid that mixes tall and short posts naturally",
    category: "blog",
    slug: "blog-masonry-layout",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
