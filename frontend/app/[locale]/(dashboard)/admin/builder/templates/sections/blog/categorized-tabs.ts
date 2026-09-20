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

const tabPill = (label: string, active = false) =>
  el.text(label, {
    fontSize: 14,
    fontWeight: "600",
    color: active ? theme.primaryText : theme.text,
    backgroundColor: active ? theme.primary : theme.bgCard,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: active ? theme.primary : theme.border,
    borderRadius: 999,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 20,
    paddingRight: 20,
    marginRight: 8,
    marginBottom: 8,
    display: "inline-block",
    cursor: "pointer",
  });

const postCard = (
  image: string,
  category: string,
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
      marginBottom: 18,
    }),
    el.text(category, {
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

export const blogCategorizedTabs: Section = section(
  [
    singleColumnRow([
      el.heading("Explore by topic", {
        level: "h2",
        fontSize: 40,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 14,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "Filter by the topics you care about most. Research, strategy, macro, DeFi — pick your lane.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "560px",
          marginBottom: 32,
          lineHeight: "1.6",
        }
      ),
    ]),
    singleColumnRow(
      [
        tabPill("All", true),
        tabPill("Research"),
        tabPill("Strategy"),
        tabPill("Macro"),
        tabPill("DeFi"),
        tabPill("Quant"),
      ],
      { marginBottom: 48, textAlign: "center" }
    ),
    row(
      [
        postCard(
          "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80",
          "RESEARCH",
          "Why execution speed matters for scalping",
          "Slippage compounds at high frequency. Here's the math.",
          "Maya Chen",
          "Apr 18"
        ),
        postCard(
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
          "STRATEGY",
          "Building a delta-neutral options portfolio",
          "Hedge gamma, harvest vega, and keep carry working for you.",
          "Jordan Park",
          "Apr 14"
        ),
        postCard(
          "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80",
          "DEFI",
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
    name: "Categorized Tabs Blog",
    description: "Topic pills above a three-column post grid for focused browsing",
    category: "blog",
    slug: "blog-categorized-tabs",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
