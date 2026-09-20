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

const hoverCard = (
  photo: string,
  alt: string,
  name: string,
  title: string,
  hint: string
) =>
  el.card(
    {
      padding: 0,
      borderRadius: 22,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      overflow: "hidden",
      position: "relative",
      transitionProperty: "transform, box-shadow",
      transitionDuration: 200,
      boxShadowX: 0,
      boxShadowY: 4,
      boxShadowBlur: 16,
      boxShadowColor: "rgba(10,18,32,0.05)",
    },
    [
      el.image(photo, alt, {
        width: "100%",
        height: "360px",
        objectFit: "cover",
        borderRadius: 0,
        marginBottom: 0,
      }),
      el.heading(name, {
        fontSize: 22,
        fontWeight: "700",
        letterSpacing: "-0.01em",
        marginBottom: 4,
        marginTop: 24,
        paddingLeft: 26,
        paddingRight: 26,
        color: theme.text,
      }),
      el.text(title, {
        fontSize: 14,
        fontWeight: "600",
        color: theme.primary,
        marginBottom: 14,
        paddingLeft: 26,
        paddingRight: 26,
      }),
      el.card(
        {
          backgroundColor: theme.bgMuted,
          borderWidth: 0,
          borderRadius: 12,
          padding: 14,
          marginLeft: 26,
          marginRight: 26,
          marginBottom: 26,
          display: "flex",
          alignItems: "center",
          gap: 10,
        },
        [
          el.icon("sparkles", {
            size: 18,
            color: theme.primary,
            marginBottom: 0,
            marginRight: 10,
          }),
          el.text(hint, {
            fontSize: 13,
            fontWeight: "500",
            color: theme.text,
            marginBottom: 0,
          }),
        ]
      ),
    ]
  );

export const teamCardHoverReveal: Section = section(
  [
    singleColumnRow([
      el.text("INTRODUCTIONS", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Tap a card to meet the person behind the work", {
        textAlign: "center",
        fontSize: 42,
        letterSpacing: "-0.02em",
        marginBottom: 16,
        maxWidth: "760px",
      }),
      el.text(
        "Hover for the short version. Tap for the long one: hobbies, hot takes, and the last ticker they watched close.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(33.33, [
          hoverCard(
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=700&q=80",
            "Portrait of Maya Chen",
            "Maya Chen",
            "Co-founder & CEO",
            "Hover to read Maya's short bio"
          ),
        ]),
        col(33.33, [
          hoverCard(
            "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=700&q=80",
            "Portrait of Jordan Park",
            "Jordan Park",
            "Co-founder & COO",
            "Hover to read Jordan's short bio"
          ),
        ]),
        col(33.33, [
          hoverCard(
            "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=700&q=80",
            "Portrait of Samir Patel",
            "Samir Patel",
            "VP Product",
            "Hover to read Samir's short bio"
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24 }
    ),
  ],
  {
    name: "Card Hover Reveal",
    description: "Three cards with hover-reveal bio hint",
    category: "team",
    slug: "team-card-hover-reveal",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
