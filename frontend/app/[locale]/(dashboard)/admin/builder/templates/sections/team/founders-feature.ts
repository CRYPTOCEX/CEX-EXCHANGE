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

const founderCard = (
  photo: string,
  alt: string,
  name: string,
  title: string,
  bio: string
) =>
  el.card(
    {
      padding: 0,
      borderRadius: 24,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      overflow: "hidden",
    },
    [
      el.image(photo, alt, {
        width: "100%",
        height: "420px",
        objectFit: "cover",
        borderRadius: 0,
        marginBottom: 0,
      }),
      el.text("CO-FOUNDER", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.16em",
        marginTop: 28,
        marginBottom: 10,
        paddingLeft: 28,
        paddingRight: 28,
      }),
      el.heading(name, {
        fontSize: 28,
        fontWeight: "800",
        letterSpacing: "-0.02em",
        marginBottom: 6,
        paddingLeft: 28,
        paddingRight: 28,
        color: theme.text,
      }),
      el.text(title, {
        fontSize: 16,
        fontWeight: "600",
        color: theme.primary,
        marginBottom: 14,
        paddingLeft: 28,
        paddingRight: 28,
      }),
      el.text(bio, {
        fontSize: 15,
        lineHeight: "1.7",
        color: theme.textMuted,
        marginBottom: 28,
        paddingLeft: 28,
        paddingRight: 28,
      }),
    ]
  );

const smallCard = (
  photo: string,
  alt: string,
  name: string,
  title: string
) =>
  el.card(
    {
      padding: 18,
      borderRadius: 14,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      textAlign: "center",
    },
    [
      el.image(photo, alt, {
        width: "72px",
        height: "72px",
        borderRadius: 999,
        marginBottom: 12,
        marginLeft: "auto",
        marginRight: "auto",
        display: "block",
        objectFit: "cover",
      }),
      el.text(name, {
        fontSize: 15,
        fontWeight: "700",
        textAlign: "center",
        color: theme.text,
        marginBottom: 4,
      }),
      el.text(title, {
        fontSize: 13,
        textAlign: "center",
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ]
  );

export const teamFoundersFeature: Section = section(
  [
    singleColumnRow([
      el.text("FOUNDING TEAM", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("The two who started it. The team that grew it.", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 56,
        maxWidth: "820px",
      }),
    ]),
    row(
      [
        col(50, [
          founderCard(
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80",
            "Portrait of Maya Chen, Co-founder and CEO",
            "Maya Chen",
            "Co-founder & CEO",
            "Market structure at a multi-strategy hedge fund for eight years before founding the company. Still sits next to the matching engine team on release days."
          ),
        ]),
        col(50, [
          founderCard(
            "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=80",
            "Portrait of Jordan Park, Co-founder and COO",
            "Jordan Park",
            "Co-founder & COO",
            "Operations lead at two exchanges before this one. Runs every release, every retro, and an unreasonable number of half-marathons."
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 28, paddingBottom: 40, verticalAlign: "top" }
    ),
    singleColumnRow([
      el.text("THE REST OF THE TEAM", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.textMuted,
        letterSpacing: "0.14em",
        marginBottom: 32,
        marginTop: 16,
      }),
    ]),
    row(
      [
        col(20, [
          smallCard(
            "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
            "Portrait of Samir Patel",
            "Samir Patel",
            "VP Product"
          ),
        ]),
        col(20, [
          smallCard(
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
            "Portrait of Priya Desai",
            "Priya Desai",
            "VP Engineering"
          ),
        ]),
        col(20, [
          smallCard(
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
            "Portrait of Marcus Okafor",
            "Marcus Okafor",
            "Head of Markets"
          ),
        ]),
        col(20, [
          smallCard(
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
            "Portrait of Elena Rossi",
            "Elena Rossi",
            "Head of Design"
          ),
        ]),
        col(20, [
          smallCard(
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
            "Portrait of Daniel Weiss",
            "Daniel Weiss",
            "Chief Risk Officer"
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 18 }
    ),
  ],
  {
    name: "Founders Feature",
    description: "Two co-founders featured large with smaller team below",
    category: "team",
    slug: "team-founders-feature",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
