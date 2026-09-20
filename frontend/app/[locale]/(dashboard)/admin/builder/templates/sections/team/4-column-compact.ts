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

const compactCard = (photo: string, alt: string, name: string, title: string) =>
  el.card(
    {
      padding: 20,
      borderRadius: 16,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      textAlign: "center",
    },
    [
      el.image(photo, alt, {
        width: "96px",
        height: "96px",
        borderRadius: 999,
        marginBottom: 16,
        marginLeft: "auto",
        marginRight: "auto",
        display: "block",
        objectFit: "cover",
      }),
      el.text(name, {
        fontSize: 16,
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

export const team4ColumnCompact: Section = section(
  [
    singleColumnRow([
      el.text("OUR PEOPLE", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("A small team with an outsized footprint", {
        textAlign: "center",
        fontSize: 42,
        letterSpacing: "-0.02em",
        marginBottom: 16,
      }),
      el.text(
        "Forty-two people. Eight offices. One Slack where every question gets answered in under an hour.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "600px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(25, [
          compactCard(
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
            "Portrait of Maya Chen",
            "Maya Chen",
            "CEO"
          ),
        ]),
        col(25, [
          compactCard(
            "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
            "Portrait of Jordan Park",
            "Jordan Park",
            "Chief Operating Officer"
          ),
        ]),
        col(25, [
          compactCard(
            "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
            "Portrait of Samir Patel",
            "Samir Patel",
            "VP Product"
          ),
        ]),
        col(25, [
          compactCard(
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
            "Portrait of Priya Desai",
            "Priya Desai",
            "VP Engineering"
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 20, paddingBottom: 20 }
    ),
    row(
      [
        col(25, [
          compactCard(
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
            "Portrait of Marcus Okafor",
            "Marcus Okafor",
            "Head of Markets"
          ),
        ]),
        col(25, [
          compactCard(
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
            "Portrait of Elena Rossi",
            "Elena Rossi",
            "Head of Design"
          ),
        ]),
        col(25, [
          compactCard(
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
            "Portrait of Daniel Weiss",
            "Daniel Weiss",
            "Chief Risk Officer"
          ),
        ]),
        col(25, [
          compactCard(
            "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=400&q=80",
            "Portrait of Amara Nwosu",
            "Amara Nwosu",
            "Head of Compliance"
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 20 }
    ),
  ],
  {
    name: "4-Column Compact",
    description: "Four-column compact team cards",
    category: "team",
    slug: "team-4-column-compact",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
