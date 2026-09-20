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

const miniCard = (photo: string, alt: string, name: string, title: string) =>
  el.card(
    {
      padding: 20,
      borderRadius: 14,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
    },
    [
      el.image(photo, alt, {
        width: "64px",
        height: "64px",
        borderRadius: 999,
        marginBottom: 14,
        objectFit: "cover",
      }),
      el.text(name, {
        fontSize: 15,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 4,
      }),
      el.text(title, {
        fontSize: 13,
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ]
  );

export const teamLeadershipSpotlight: Section = section(
  [
    singleColumnRow([
      el.text("LEADERSHIP", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Led by operators who shipped before they managed", {
        textAlign: "center",
        fontSize: 42,
        letterSpacing: "-0.02em",
        marginBottom: 56,
        maxWidth: "820px",
      }),
    ]),
    row(
      [
        col(50, [
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
              el.image(
                "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=80",
                "Portrait of Maya Chen, Co-founder and Chief Executive Officer",
                {
                  width: "100%",
                  height: "480px",
                  objectFit: "cover",
                  borderRadius: 0,
                  marginBottom: 0,
                }
              ),
              el.text("FEATURED", {
                fontSize: 12,
                fontWeight: "700",
                color: theme.primary,
                letterSpacing: "0.16em",
                marginTop: 32,
                marginBottom: 10,
                paddingLeft: 32,
                paddingRight: 32,
              }),
              el.heading("Maya Chen", {
                fontSize: 32,
                fontWeight: "800",
                letterSpacing: "-0.02em",
                marginBottom: 6,
                paddingLeft: 32,
                paddingRight: 32,
                color: theme.text,
              }),
              el.text("Co-founder & CEO", {
                fontSize: 17,
                fontWeight: "600",
                color: theme.primary,
                marginBottom: 16,
                paddingLeft: 32,
                paddingRight: 32,
              }),
              el.text(
                "Maya spent eight years running market structure at a multi-strategy hedge fund before founding the company in 2018. She still sits next to the matching engine team on release days and answers every customer email before 7 AM.",
                {
                  fontSize: 16,
                  lineHeight: "1.7",
                  color: theme.textMuted,
                  marginBottom: 32,
                  paddingLeft: 32,
                  paddingRight: 32,
                }
              ),
            ]
          ),
        ]),
        col(50, [
          row(
            [
              col(50, [
                miniCard(
                  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
                  "Portrait of Jordan Park",
                  "Jordan Park",
                  "Chief Operating Officer"
                ),
              ]),
              col(50, [
                miniCard(
                  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
                  "Portrait of Samir Patel",
                  "Samir Patel",
                  "VP Product"
                ),
              ]),
            ],
            { gutter: 16, paddingTop: 0, paddingBottom: 16, maxWidth: "100%" }
          ),
          row(
            [
              col(50, [
                miniCard(
                  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
                  "Portrait of Priya Desai",
                  "Priya Desai",
                  "VP Engineering"
                ),
              ]),
              col(50, [
                miniCard(
                  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
                  "Portrait of Marcus Okafor",
                  "Marcus Okafor",
                  "Head of Markets"
                ),
              ]),
            ],
            { gutter: 16, paddingTop: 0, paddingBottom: 16, maxWidth: "100%" }
          ),
          row(
            [
              col(50, [
                miniCard(
                  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
                  "Portrait of Elena Rossi",
                  "Elena Rossi",
                  "Head of Design"
                ),
              ]),
              col(50, [
                miniCard(
                  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
                  "Portrait of Daniel Weiss",
                  "Daniel Weiss",
                  "Chief Risk Officer"
                ),
              ]),
            ],
            { gutter: 16, paddingTop: 0, paddingBottom: 0, maxWidth: "100%" }
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 32, verticalAlign: "top" }
    ),
  ],
  {
    name: "Leadership Spotlight",
    description: "Featured leader card with a grid of others",
    category: "team",
    slug: "team-leadership-spotlight",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
