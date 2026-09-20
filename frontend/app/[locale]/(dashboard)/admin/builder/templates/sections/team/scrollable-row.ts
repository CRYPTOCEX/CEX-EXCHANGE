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

const stripCard = (
  photo: string,
  alt: string,
  name: string,
  title: string
) =>
  el.card(
    {
      padding: 0,
      borderRadius: 18,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      overflow: "hidden",
      width: "260px",
      minWidth: "260px",
      marginRight: 20,
      display: "inline-block",
    },
    [
      el.image(photo, alt, {
        width: "260px",
        height: "300px",
        objectFit: "cover",
        borderRadius: 0,
        marginBottom: 0,
      }),
      el.text(name, {
        fontSize: 16,
        fontWeight: "700",
        color: theme.text,
        marginTop: 16,
        marginBottom: 4,
        paddingLeft: 18,
        paddingRight: 18,
      }),
      el.text(title, {
        fontSize: 13,
        color: theme.textMuted,
        marginBottom: 18,
        paddingLeft: 18,
        paddingRight: 18,
      }),
    ]
  );

export const teamScrollableRow: Section = section(
  [
    singleColumnRow([
      el.text("EVERY TEAMMATE", {
        fontSize: 13,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Scroll through the whole team", {
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 16,
      }),
      el.text(
        "All forty-two of us, in no particular order. Tap a card to read the full bio.",
        {
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 48,
        }
      ),
    ]),
    singleColumnRow(
      [
        el.card(
          {
            padding: 0,
            borderWidth: 0,
            backgroundColor: "transparent",
            overflow: "auto",
            whiteSpace: "nowrap",
            paddingTop: 8,
            paddingBottom: 24,
            paddingLeft: 4,
            paddingRight: 4,
          },
          [
            stripCard(
              "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80",
              "Portrait of Maya Chen",
              "Maya Chen",
              "CEO"
            ),
            stripCard(
              "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=500&q=80",
              "Portrait of Jordan Park",
              "Jordan Park",
              "COO"
            ),
            stripCard(
              "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=500&q=80",
              "Portrait of Samir Patel",
              "Samir Patel",
              "VP Product"
            ),
            stripCard(
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=500&q=80",
              "Portrait of Priya Desai",
              "Priya Desai",
              "VP Engineering"
            ),
            stripCard(
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80",
              "Portrait of Marcus Okafor",
              "Marcus Okafor",
              "Head of Markets"
            ),
            stripCard(
              "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80",
              "Portrait of Elena Rossi",
              "Elena Rossi",
              "Head of Design"
            ),
            stripCard(
              "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80",
              "Portrait of Daniel Weiss",
              "Daniel Weiss",
              "Chief Risk Officer"
            ),
            stripCard(
              "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=500&q=80",
              "Portrait of Amara Nwosu",
              "Amara Nwosu",
              "Head of Compliance"
            ),
            stripCard(
              "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=500&q=80",
              "Portrait of Theo Lambert",
              "Theo Lambert",
              "Head of Talent"
            ),
          ]
        ),
      ],
      { ...rowPresets.wide }
    ),
  ],
  {
    name: "Scrollable Team Row",
    description: "Horizontal scrolling team strip",
    category: "team",
    slug: "team-scrollable-row",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
