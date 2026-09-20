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

const socialIconSettings = {
  size: 20,
  color: theme.textMuted,
  marginRight: 18,
  marginBottom: 0,
  display: "inline-block",
  cursor: "pointer",
};

const socialCard = (
  photo: string,
  alt: string,
  name: string,
  title: string,
  bio: string
) =>
  el.card(
    {
      padding: 28,
      borderRadius: 18,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
    },
    [
      el.image(photo, alt, {
        width: "88px",
        height: "88px",
        borderRadius: 999,
        marginBottom: 20,
        objectFit: "cover",
      }),
      el.heading(name, {
        fontSize: 20,
        fontWeight: "700",
        letterSpacing: "-0.01em",
        marginBottom: 4,
        color: theme.text,
      }),
      el.text(title, {
        fontSize: 14,
        fontWeight: "600",
        color: theme.primary,
        marginBottom: 12,
      }),
      el.text(bio, {
        fontSize: 14,
        lineHeight: "1.6",
        color: theme.textMuted,
        marginBottom: 20,
      }),
      el.divider({ marginTop: 0, marginBottom: 16 }),
      el.icon("twitter", socialIconSettings),
      el.icon("linkedin", socialIconSettings),
      el.icon("github", socialIconSettings),
      el.icon("globe", { ...socialIconSettings, marginRight: 0 }),
    ]
  );

export const teamWithSocialLinks: Section = section(
  [
    singleColumnRow([
      el.text("THE TEAM", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Say hello anywhere", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 16,
      }),
      el.text(
        "Every teammate is a few clicks away. DMs are usually open, emails are always read.",
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
          socialCard(
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
            "Portrait of Maya Chen",
            "Maya Chen",
            "Co-founder & CEO",
            "Market microstructure, distributed systems, and very strong espresso."
          ),
        ]),
        col(33.33, [
          socialCard(
            "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
            "Portrait of Jordan Park",
            "Jordan Park",
            "Chief Operating Officer",
            "Operations, incident response, and making sure Friday deploys stay boring."
          ),
        ]),
        col(33.33, [
          socialCard(
            "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
            "Portrait of Samir Patel",
            "Samir Patel",
            "VP Product",
            "Order flow visualization, API ergonomics, and teaching juniors to read tick data."
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24, paddingBottom: 24 }
    ),
    row(
      [
        col(33.33, [
          socialCard(
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
            "Portrait of Priya Desai",
            "Priya Desai",
            "VP Engineering",
            "Matching engine, fault tolerance, and occasionally a very good pull request review."
          ),
        ]),
        col(33.33, [
          socialCard(
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
            "Portrait of Elena Rossi",
            "Elena Rossi",
            "Head of Design",
            "Order entry ergonomics, motion design, and typography that will not budge under load."
          ),
        ]),
        col(33.33, [
          socialCard(
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
            "Portrait of Marcus Okafor",
            "Marcus Okafor",
            "Head of Markets",
            "Venue connectivity, liquidity, and onboarding the desks who move the biggest tickets."
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24 }
    ),
  ],
  {
    name: "Team with Social Links",
    description: "Team cards with social icon rows",
    category: "team",
    slug: "team-with-social-links",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
