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

const postCard = (
  image: string,
  category: string,
  title: string,
  excerpt: string,
  author: string,
  date: string
) =>
  col(
    33.33,
    [
      el.image(image, title, {
        width: "100%",
        height: "220px",
        objectFit: "cover",
        borderRadius: 16,
        marginBottom: 20,
      }),
      el.text(category, {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.15em",
        marginBottom: 12,
      }),
      el.heading(title, {
        level: "h3",
        fontSize: 22,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 12,
        letterSpacing: "-0.01em",
        lineHeight: "1.3",
      }),
      el.text(excerpt, {
        fontSize: 15,
        lineHeight: "1.65",
        color: theme.textMuted,
        marginBottom: 16,
      }),
      el.text(`${author} · ${date}`, {
        fontSize: 13,
        color: theme.textDim,
        marginBottom: 0,
      }),
    ]
  );

export const blogThreeColumnGrid: Section = section(
  [
    singleColumnRow([
      el.text("FROM THE BLOG", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.22em",
        marginBottom: 14,
        textAlign: "center",
      }),
      el.heading("Field notes from the desk", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "Short reads, fresh research, and practitioner playbooks — written by the team, for the community.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "600px",
          marginBottom: 64,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        postCard(
          "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80",
          "RESEARCH",
          "Why execution speed matters for scalping",
          "Slippage compounds at high frequency. A look at how one millisecond shows up on a year-end P&L.",
          "Maya Chen",
          "Apr 18"
        ),
        postCard(
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
          "STRATEGY",
          "Building a delta-neutral options portfolio",
          "A practical walkthrough of hedging gamma while harvesting vega — with real greeks from our book.",
          "Jordan Park",
          "Apr 14"
        ),
        postCard(
          "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80",
          "DEFI",
          "A field guide to DeFi lending protocols",
          "Where yield actually comes from, how to price risk, and the five metrics that separate safe from sketchy.",
          "Samir Patel",
          "Apr 09"
        ),
      ],
      { ...rowPresets.wide, gutter: 32, verticalAlign: "top" }
    ),
  ],
  {
    name: "Three Column Blog Grid",
    description: "Classic trio of featured blog posts with image, category, title, and byline",
    category: "blog",
    slug: "blog-three-column-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
