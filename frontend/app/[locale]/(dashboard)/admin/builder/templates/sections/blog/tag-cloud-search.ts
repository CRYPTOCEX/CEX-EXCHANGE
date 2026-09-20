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

const tag = (label: string, count: number) =>
  el.text(`${label} · ${count}`, {
    fontSize: 13,
    fontWeight: "500",
    color: theme.text,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.border,
    borderRadius: 999,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 14,
    paddingRight: 14,
    marginRight: 8,
    marginBottom: 8,
    display: "inline-block",
    cursor: "pointer",
  });

const postCard = (
  image: string,
  tags: string,
  title: string,
  excerpt: string,
  author: string,
  date: string
) =>
  col(33.33, [
    el.image(image, title, {
      width: "100%",
      height: "200px",
      objectFit: "cover",
      borderRadius: 14,
      marginBottom: 16,
    }),
    el.text(tags, {
      fontSize: 11,
      fontWeight: "700",
      color: theme.primary,
      letterSpacing: "0.18em",
      marginBottom: 10,
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
    el.text(excerpt, {
      fontSize: 14,
      lineHeight: "1.6",
      color: theme.textMuted,
      marginBottom: 12,
    }),
    el.text(`${author} · ${date}`, {
      fontSize: 12,
      color: theme.textDim,
      marginBottom: 0,
    }),
  ]);

export const blogTagCloudSearch: Section = section(
  [
    singleColumnRow([
      el.heading("Search the archive", {
        level: "h2",
        fontSize: 40,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 14,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "450+ posts across markets, macro, and tech. Search by keyword, or pick a tag.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "560px",
          marginBottom: 28,
          lineHeight: "1.6",
        }
      ),
      el.text("Search posts, authors, or topics", {
        fontSize: 15,
        color: theme.textDim,
        backgroundColor: theme.bgCard,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: theme.border,
        borderRadius: 12,
        paddingTop: 14,
        paddingBottom: 14,
        paddingLeft: 22,
        paddingRight: 22,
        maxWidth: "560px",
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: 24,
      }),
    ]),
    singleColumnRow(
      [
        tag("Research", 82),
        tag("Strategy", 64),
        tag("Macro", 48),
        tag("DeFi", 36),
        tag("Quant", 29),
        tag("Options", 24),
        tag("Infrastructure", 18),
        tag("Risk", 15),
      ],
      { marginBottom: 48, maxWidth: "720px", textAlign: "center" }
    ),
    row(
      [
        postCard(
          "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80",
          "RESEARCH · QUANT",
          "Why execution speed matters for scalping",
          "Slippage compounds at high frequency. Here's the math.",
          "Maya Chen",
          "Apr 18"
        ),
        postCard(
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
          "STRATEGY · OPTIONS",
          "Building a delta-neutral options portfolio",
          "Hedge gamma, harvest vega, keep carry working for you.",
          "Jordan Park",
          "Apr 14"
        ),
        postCard(
          "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80",
          "DEFI · RISK",
          "A field guide to DeFi lending protocols",
          "Where yield comes from, how to price risk, what to avoid.",
          "Samir Patel",
          "Apr 09"
        ),
      ],
      { ...rowPresets.wide, gutter: 28, verticalAlign: "top" }
    ),
  ],
  {
    name: "Tag Cloud + Search",
    description: "Search bar above a pill-style tag cloud, with the current results below",
    category: "blog",
    slug: "blog-tag-cloud-search",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
