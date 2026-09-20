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

const textPost = (
  date: string,
  title: string,
  author: string,
  readTime: string
) =>
  row(
    [
      col(15, [
        el.text(date, {
          fontSize: 14,
          fontWeight: "500",
          color: theme.textDim,
          marginBottom: 0,
          fontVariantNumeric: "tabular-nums",
        }),
      ]),
      col(65, [
        el.heading(title, {
          level: "h3",
          fontSize: 28,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 0,
          letterSpacing: "-0.02em",
          lineHeight: "1.25",
        }),
      ]),
      col(20, [
        el.text(`${author} · ${readTime}`, {
          fontSize: 13,
          color: theme.textDim,
          marginBottom: 0,
          textAlign: "right",
        }),
      ]),
    ],
    {
      ...rowPresets.narrow,
      gutter: 24,
      paddingTop: 28,
      paddingBottom: 28,
      borderBottom: true,
      borderColor: theme.border,
      borderWidth: 1,
      borderStyle: "solid",
      verticalAlign: "middle",
    }
  );

export const blogMinimalTypographyBlog: Section = section(
  [
    singleColumnRow(
      [
        el.text("THE JOURNAL", {
          fontSize: 12,
          fontWeight: "700",
          color: theme.primary,
          letterSpacing: "0.25em",
          marginBottom: 20,
          textAlign: "center",
        }),
        el.heading("Words, unadorned.", {
          level: "h2",
          fontSize: 64,
          fontWeight: "800",
          textAlign: "center",
          color: theme.text,
          marginBottom: 16,
          letterSpacing: "-0.04em",
          lineHeight: "1.05",
        }),
        el.text(
          "Ten recent posts. No images, no cards, no clutter — just ideas and the people who wrote them.",
          {
            fontSize: 18,
            textAlign: "center",
            color: theme.textMuted,
            maxWidth: "560px",
            marginBottom: 64,
            lineHeight: "1.6",
          }
        ),
      ]
    ),
    textPost("Apr 18", "Why execution speed matters for scalping", "Maya Chen", "7 min"),
    textPost("Apr 14", "Building a delta-neutral options portfolio", "Jordan Park", "9 min"),
    textPost("Apr 09", "A field guide to DeFi lending protocols", "Samir Patel", "11 min"),
    textPost("Apr 04", "The yield curve and what it's telling us now", "Lena Rossi", "6 min"),
    textPost("Mar 30", "A simpler factor model beats a complex one", "Taro Yamada", "8 min"),
    textPost("Mar 26", "Order types, explained for builders", "Maya Chen", "5 min"),
    textPost("Mar 18", "Reading an order book without lying to yourself", "Maya Chen", "10 min"),
    textPost("Mar 12", "How we think about slippage internally", "Jordan Park", "6 min"),
    textPost("Mar 04", "A note on latency arbitrage", "Maya Chen", "4 min"),
    textPost("Feb 26", "Position sizing for volatile markets", "Lena Rossi", "7 min"),
  ],
  {
    name: "Minimal Typography Blog",
    description: "Text-only post list with large typography, dates, bylines, and hairline dividers",
    category: "blog",
    slug: "blog-minimal-typography-blog",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
