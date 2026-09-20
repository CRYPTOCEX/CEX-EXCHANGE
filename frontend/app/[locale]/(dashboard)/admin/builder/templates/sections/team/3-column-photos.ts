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

const memberCard = (
  photo: string,
  alt: string,
  name: string,
  title: string,
  bio: string
) =>
  el.card(
    {
      padding: 0,
      borderRadius: 20,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      overflow: "hidden",
    },
    [
      el.image(photo, alt, {
        width: "100%",
        height: "320px",
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
        paddingLeft: 28,
        paddingRight: 28,
        color: theme.text,
      }),
      el.text(title, {
        fontSize: 15,
        fontWeight: "600",
        color: theme.primary,
        marginBottom: 12,
        paddingLeft: 28,
        paddingRight: 28,
      }),
      el.text(bio, {
        fontSize: 15,
        lineHeight: "1.6",
        color: theme.textMuted,
        marginBottom: 28,
        paddingLeft: 28,
        paddingRight: 28,
      }),
    ]
  );

export const team3ColumnPhotos: Section = section(
  [
    singleColumnRow([
      el.text("MEET THE TEAM", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("The people behind the platform", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 16,
      }),
      el.text(
        "A small group of engineers, quants, and designers with a shared obsession for execution quality.",
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
          memberCard(
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
            "Portrait of Maya Chen, Co-founder and CEO",
            "Maya Chen",
            "Co-founder & CEO",
            "Previously led market structure at a multi-strategy hedge fund. Believes latency is a feature, not a metric."
          ),
        ]),
        col(33.33, [
          memberCard(
            "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80",
            "Portrait of Jordan Park, Chief Operating Officer",
            "Jordan Park",
            "Chief Operating Officer",
            "Built and ran operations at two exchanges before this one. Runs every release and every retrospective."
          ),
        ]),
        col(33.33, [
          memberCard(
            "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80",
            "Portrait of Samir Patel, VP Product",
            "Samir Patel",
            "VP Product",
            "Ten years shipping trading surfaces for retail and institutional desks. Treats UX as a risk control."
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 28 }
    ),
  ],
  {
    name: "3-Column Photos",
    description: "Three-column team grid with photos and short bios",
    category: "team",
    slug: "team-3-column-photos",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
