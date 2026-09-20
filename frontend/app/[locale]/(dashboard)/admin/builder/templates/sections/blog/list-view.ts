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

const listRow = (
  image: string,
  category: string,
  title: string,
  excerpt: string,
  author: string,
  date: string,
  readTime: string
) =>
  row(
    [
      col(30, [
        el.image(image, title, {
          width: "100%",
          height: "180px",
          objectFit: "cover",
          borderRadius: 14,
          marginBottom: 0,
        }),
      ]),
      col(70, [
        el.text(category, {
          fontSize: 11,
          fontWeight: "700",
          color: theme.primary,
          letterSpacing: "0.2em",
          marginBottom: 10,
        }),
        el.heading(title, {
          level: "h3",
          fontSize: 24,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 10,
          letterSpacing: "-0.02em",
          lineHeight: "1.25",
        }),
        el.text(excerpt, {
          fontSize: 15,
          lineHeight: "1.65",
          color: theme.textMuted,
          marginBottom: 12,
        }),
        el.text(`${author} · ${date} · ${readTime}`, {
          fontSize: 13,
          color: theme.textDim,
          marginBottom: 0,
        }),
      ]),
    ],
    {
      ...rowPresets.contained,
      gutter: 28,
      paddingTop: 28,
      paddingBottom: 28,
      borderBottom: true,
      borderColor: theme.border,
      borderWidth: 1,
      borderStyle: "solid",
      verticalAlign: "middle",
    }
  );

export const blogListView: Section = section(
  [
    singleColumnRow([
      el.heading("Every post, in order", {
        level: "h2",
        fontSize: 42,
        fontWeight: "800",
        color: theme.text,
        marginBottom: 14,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "A chronological stream — most recent first. Skim, dip in, or read straight through.",
        {
          fontSize: 17,
          color: theme.textMuted,
          marginBottom: 32,
          lineHeight: "1.6",
          maxWidth: "640px",
        }
      ),
    ]),
    listRow(
      "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80",
      "RESEARCH",
      "Why execution speed matters for scalping",
      "Slippage compounds at high frequency. A year of trades, rebuilt tick by tick, to show where every millisecond went.",
      "Maya Chen",
      "Apr 18",
      "7 min read"
    ),
    listRow(
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
      "STRATEGY",
      "Building a delta-neutral options portfolio",
      "A practical walkthrough of hedging gamma while harvesting vega — with live greeks from our book.",
      "Jordan Park",
      "Apr 14",
      "9 min read"
    ),
    listRow(
      "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80",
      "DEFI",
      "A field guide to DeFi lending protocols",
      "Where yield comes from, how to price risk, and the five ratios that separate good pools from bad.",
      "Samir Patel",
      "Apr 09",
      "11 min read"
    ),
    listRow(
      "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=800&q=80",
      "MACRO",
      "The yield curve and what it's telling us now",
      "The shape of the curve rhymes with prior cycles — but a few things are different this time. Here's what stands out.",
      "Lena Rossi",
      "Apr 04",
      "6 min read"
    ),
  ],
  {
    name: "Blog List View",
    description: "Horizontal list of posts with thumbnail, copy, byline, and read-time",
    category: "blog",
    slug: "blog-list-view",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
