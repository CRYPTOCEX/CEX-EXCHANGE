import type { Section, Column, Row, Element } from "@/types/builder";
import { generateId } from "@/store/builder-store";
import {
  el,
  row,
  col,
  section,
  theme,
  gradients,
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

const statBlock = (label: string, value: string): Element[] => [
  el.text(label, {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: "0.16em",
    color: theme.onBandDim,
    marginBottom: 6,
  }),
  el.heading(value, {
    level: "h3",
    fontSize: 22,
    fontWeight: "700",
    color: theme.onBand,
    marginBottom: 0,
  }),
];

export const nftCollectionHeroBanner: Section = section(
  [
    row(
      [
        colR(
          55,
          [
            el.text("FEATURED COLLECTION", {
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: "0.18em",
              color: theme.onBand,
              backgroundColor: theme.onBandFill,
              borderRadius: 999,
              paddingTop: 8,
              paddingBottom: 8,
              paddingLeft: 16,
              paddingRight: 16,
              marginBottom: 24,
              maxWidth: "220px",
            }),
            el.heading("Cyber Apes Genesis", {
              level: "h1",
              fontSize: 72,
              fontWeight: "800",
              letterSpacing: "-0.03em",
              lineHeight: "1.02",
              color: theme.onBand,
              marginBottom: 20,
            }),
            el.text(
              "10,000 hand-illustrated primates engineered on-chain. Each Ape is a unique wearable identity for the metaverse.",
              {
                fontSize: 19,
                lineHeight: "1.65",
                color: theme.onBandMuted,
                marginBottom: 36,
                maxWidth: "520px",
              }
            ),
          ],
          [
            row(
              [
                col(33, statBlock("FLOOR", "0.45 ETH")),
                col(33, statBlock("VOLUME", "48.2K USDC")),
                col(34, statBlock("OWNERS", "3,842")),
              ],
              { gutter: 16, marginBottom: 32, maxWidth: "100%" }
            ),
            row(
              [
                col(100, [
                  el.button("Explore collection", "/nft/cyber-apes", {
                    backgroundColor: theme.onBandSurface,
                    color: theme.onBandSurfaceInk,
                    fontSize: 16,
                  }),
                  el.button("View on-chain", "/nft/cyber-apes/contract", {
                    backgroundColor: theme.onBandFill,
                    color: theme.onBand,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: theme.onBandBorder,
                    fontSize: 16,
                  }),
                ]),
              ],
              { gutter: 0, maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
            ),
          ]
        ),
        col(45, [
          el.image(
            "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=1200&q=80",
            "Cyber Apes Genesis hero artwork — abstract digital-art portrait",
            {
              borderRadius: 24,
              boxShadowX: 0,
              boxShadowY: 32,
              boxShadowBlur: 64,
              boxShadowColor: "rgba(10,18,32,0.35)",
            }
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 56 }
    ),
  ],
  {
    name: "Collection Hero Banner",
    description: "Full-bleed NFT collection banner with floor price and volume",
    category: "nft",
    slug: "nft-collection-hero-banner",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: gradients.indigoViolet,
    },
  }
);
