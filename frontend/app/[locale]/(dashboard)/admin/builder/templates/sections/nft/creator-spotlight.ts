import type { Section, Element, Column, Row } from "@/types/builder";
import { generateId } from "@/store/builder-store";
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

const colR = (
  width: number,
  elements: Element[],
  rows: Row[],
  settings: Record<string, unknown> = {}
): Column => ({
  id: generateId("column"),
  width,
  elements,
  rows,
  settings: { paddingTop: 0, paddingBottom: 0, paddingLeft: 12, paddingRight: 12, ...settings },
  nestingLevel: 1,
});

const workTile = (image: string, title: string, price: string): Element[] => [
  el.image(image, `${title} artwork by featured creator`, {
    borderRadius: 14,
    marginBottom: 12,
    height: "180px",
    width: "100%",
  }),
  el.text(title, {
    fontSize: 13,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 4,
  }),
  el.text(price, {
    fontSize: 12,
    color: theme.textMuted,
    marginBottom: 0,
  }),
];

const workSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 16,
  padding: 14,
};

export const nftCreatorSpotlight: Section = section(
  [
    singleColumnRow([
      el.text("CREATOR SPOTLIGHT", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.violet,
        marginBottom: 48,
      }),
    ]),
    row(
      [
        col(30, [
          el.image(
            "https://images.unsplash.com/photo-1635776062043-223faf322554?w=600&q=80",
            "Portrait of featured digital artist Mira Vos",
            {
              borderRadius: 200,
              width: "160px",
              height: "160px",
              marginBottom: 24,
            }
          ),
          el.heading("Mira Vos", {
            level: "h2",
            fontSize: 32,
            fontWeight: "800",
            letterSpacing: "-0.02em",
            color: theme.text,
            marginBottom: 8,
          }),
          el.text("@miravos • Voidwalkers creator", {
            fontSize: 14,
            fontWeight: "600",
            color: theme.violet,
            marginBottom: 20,
          }),
          el.text(
            "Berlin-based 3d artist exploring liminal urban dreamscapes. 12K followers, 420 ETH lifetime volume across three collections.",
            {
              fontSize: 15,
              lineHeight: "1.65",
              color: theme.textMuted,
              marginBottom: 28,
            }
          ),
          el.button("View profile", "/nft/creator/miravos", { fontSize: 15 }),
          el.button("Follow", "#", {
            backgroundColor: "transparent",
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            fontSize: 15,
          }),
        ]),
        colR(70, [
          el.heading("Selected works", {
            level: "h3",
            fontSize: 20,
            fontWeight: "700",
            color: theme.text,
            marginBottom: 20,
          }),
        ], [
          row(
            [
              col(
                33,
                workTile(
                  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80",
                  "Hollow Moon #02",
                  "0.84 ETH"
                ),
                workSettings
              ),
              col(
                33,
                workTile(
                  "https://images.unsplash.com/photo-1633101585272-9e0b0c3d9f9e?w=600&q=80",
                  "Voidwalkers #64",
                  "0.92 ETH"
                ),
                workSettings
              ),
              col(
                34,
                workTile(
                  "https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=600&q=80",
                  "Drift Protocol",
                  "1.10 ETH"
                ),
                workSettings
              ),
            ],
            { gutter: 16, verticalAlign: "top", marginBottom: 16, maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
          ),
          row(
            [
              col(
                33,
                workTile(
                  "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=600&q=80",
                  "Pale Signal",
                  "0.48 ETH"
                ),
                workSettings
              ),
              col(
                33,
                workTile(
                  "https://images.unsplash.com/photo-1614812513172-567d2fe96a75?w=600&q=80",
                  "Neon Fragment",
                  "0.32 ETH"
                ),
                workSettings
              ),
              col(
                34,
                workTile(
                  "https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=600&q=80",
                  "Residue 03",
                  "0.28 ETH"
                ),
                workSettings
              ),
            ],
            { gutter: 16, verticalAlign: "top", maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 56, verticalAlign: "top" }
    ),
  ],
  {
    name: "Creator Spotlight",
    description: "Featured creator with avatar, bio, and six-work grid",
    category: "nft",
    slug: "nft-creator-spotlight",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
