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

const masonryItem = (
  photo: string,
  alt: string,
  name: string,
  title: string,
  height: string
) =>
  el.card(
    {
      padding: 0,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 0,
      backgroundColor: theme.bgCard,
      position: "relative",
      marginBottom: 20,
    },
    [
      el.image(photo, alt, {
        width: "100%",
        height,
        objectFit: "cover",
        borderRadius: 0,
        marginBottom: 0,
      }),
      el.text(name, {
        fontSize: 16,
        fontWeight: "700",
        color: theme.text,
        marginTop: 14,
        marginBottom: 2,
        paddingLeft: 16,
        paddingRight: 16,
      }),
      el.text(title, {
        fontSize: 13,
        color: theme.textMuted,
        marginBottom: 16,
        paddingLeft: 16,
        paddingRight: 16,
      }),
    ]
  );

export const teamMasonryTeam: Section = section(
  [
    singleColumnRow([
      el.text("LIFE HERE", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Faces, not org charts", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 16,
      }),
      el.text(
        "An asymmetric look at a symmetric team. Roughly ordered by whoever has the strongest coffee opinion.",
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
          masonryItem(
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
            "Portrait of Maya Chen",
            "Maya Chen",
            "CEO",
            "320px"
          ),
          masonryItem(
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=600&q=80",
            "Portrait of Priya Desai",
            "Priya Desai",
            "VP Engineering",
            "220px"
          ),
          masonryItem(
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
            "Portrait of Elena Rossi",
            "Elena Rossi",
            "Head of Design",
            "280px"
          ),
        ]),
        col(33.33, [
          masonryItem(
            "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80",
            "Portrait of Jordan Park",
            "Jordan Park",
            "COO",
            "240px"
          ),
          masonryItem(
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
            "Portrait of Daniel Weiss",
            "Daniel Weiss",
            "Chief Risk Officer",
            "320px"
          ),
          masonryItem(
            "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=600&q=80",
            "Portrait of Amara Nwosu",
            "Amara Nwosu",
            "Head of Compliance",
            "220px"
          ),
        ]),
        col(33.33, [
          masonryItem(
            "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80",
            "Portrait of Samir Patel",
            "Samir Patel",
            "VP Product",
            "280px"
          ),
          masonryItem(
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
            "Portrait of Marcus Okafor",
            "Marcus Okafor",
            "Head of Markets",
            "220px"
          ),
          masonryItem(
            "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80",
            "Portrait of Theo Lambert",
            "Theo Lambert",
            "Head of Talent",
            "320px"
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 20, verticalAlign: "top" }
    ),
  ],
  {
    name: "Masonry Team",
    description: "Asymmetric team photo layout",
    category: "team",
    slug: "team-masonry-team",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
