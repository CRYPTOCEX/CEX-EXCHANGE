import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  gradients,
  sectionPresets,
  rowPresets,
} from "../../utils";

const postCard = (
  image: string,
  category: string,
  title: string,
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
    el.text(`${author} · ${date}`, {
      fontSize: 12,
      color: theme.textDim,
      marginBottom: 0,
    }),
  ]);

export const blogNewsletterCtaBlog: Section = section(
  [
    singleColumnRow([
      el.heading("Fresh from the team", {
        level: "h2",
        fontSize: 40,
        fontWeight: "800",
        color: theme.text,
        marginBottom: 40,
        letterSpacing: "-0.03em",
        textAlign: "center",
      }),
    ]),
    row(
      [
        postCard(
          "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80",
          "RESEARCH",
          "Why execution speed matters for scalping",
          "Maya Chen",
          "Apr 18"
        ),
        postCard(
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
          "STRATEGY",
          "Building a delta-neutral options portfolio",
          "Jordan Park",
          "Apr 14"
        ),
        postCard(
          "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80",
          "DEFI",
          "A field guide to DeFi lending protocols",
          "Samir Patel",
          "Apr 09"
        ),
      ],
      { ...rowPresets.wide, gutter: 28, marginBottom: 56, verticalAlign: "top" }
    ),
    row(
      [
        col(55, [
          el.heading("Get new posts in your inbox", {
            level: "h3",
            fontSize: 30,
            fontWeight: "800",
            color: theme.onBand,
            marginBottom: 10,
            letterSpacing: "-0.02em",
            lineHeight: "1.2",
          }),
          el.text("One email, every Thursday. Only our best reads, no fluff.", {
            fontSize: 16,
            color: theme.onBandMuted,
            marginBottom: 0,
            lineHeight: "1.6",
          }),
        ]),
        col(30, [
          el.text("you@company.com", {
            fontSize: 15,
            color: theme.onBandDim,
            backgroundColor: theme.onBandFill,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.onBandBorder,
            borderRadius: 10,
            paddingTop: 14,
            paddingBottom: 14,
            paddingLeft: 18,
            paddingRight: 18,
            marginBottom: 0,
          }),
        ]),
        col(15, [
          el.button("Subscribe", "#", {
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            width: "100%",
            marginTop: 0,
            marginRight: 0,
            textAlign: "center",
          }),
        ]),
      ],
      {
        ...rowPresets.contained,
        gutter: 20,
        maxWidth: "960px",
        verticalAlign: "middle",
        backgroundColor: gradients.indigoViolet,
        borderRadius: 24,
        paddingTop: 36,
        paddingBottom: 36,
        paddingLeft: 40,
        paddingRight: 40,
        marginBottom: 56,
      }
    ),
    row(
      [
        postCard(
          "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=800&q=80",
          "MACRO",
          "The yield curve and what it's telling us now",
          "Lena Rossi",
          "Apr 04"
        ),
        postCard(
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
          "QUANT",
          "A simpler factor model beats a complex one",
          "Taro Yamada",
          "Mar 30"
        ),
        postCard(
          "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80",
          "INFRASTRUCTURE",
          "Order types, explained for builders",
          "Maya Chen",
          "Mar 26"
        ),
      ],
      { ...rowPresets.wide, gutter: 28, verticalAlign: "top" }
    ),
  ],
  {
    name: "Blog with Newsletter CTA",
    description: "Three-column blog grid interrupted mid-page by a gradient newsletter band",
    category: "blog",
    slug: "blog-newsletter-cta-blog",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
