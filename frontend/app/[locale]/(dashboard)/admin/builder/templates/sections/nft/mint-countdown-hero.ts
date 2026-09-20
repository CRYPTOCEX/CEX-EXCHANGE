import type { Section, Element, Column, Row } from "@/types/builder";
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

const countdownBlock = (value: string, label: string): Element[] => [
  el.heading(value, {
    level: "h3",
    fontSize: 52,
    fontWeight: "800",
    letterSpacing: "-0.03em",
    color: theme.onBand,
    marginBottom: 8,
    textAlign: "center",
  }),
  el.text(label, {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: "0.18em",
    textAlign: "center",
    color: theme.onBandDim,
    marginBottom: 0,
  }),
];

const countdownCardSettings = {
  backgroundColor: theme.onBandFill,
  borderColor: theme.onBandBorder,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 16,
  padding: 24,
};

export const nftMintCountdownHero: Section = section(
  [
    row(
      [
        colR(55, [
          el.text("MINTING SOON", {
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
            maxWidth: "180px",
          }),
          el.heading("Quantum Koi — public mint", {
            level: "h1",
            fontSize: 58,
            fontWeight: "800",
            letterSpacing: "-0.025em",
            lineHeight: "1.05",
            color: theme.onBand,
            marginBottom: 20,
          }),
          el.text(
            "5,000 generative koi swimming the chain. 0.08 ETH mint, 2 per wallet, reveal at sellout.",
            {
              fontSize: 18,
              lineHeight: "1.65",
              color: theme.onBandMuted,
              marginBottom: 36,
              maxWidth: "520px",
            }
          ),
        ], [
          row(
            [
              col(25, countdownBlock("3", "DAYS"), countdownCardSettings),
              col(25, countdownBlock("12", "HOURS"), countdownCardSettings),
              col(25, countdownBlock("45", "MINUTES"), countdownCardSettings),
              col(25, countdownBlock("22", "SECONDS"), countdownCardSettings),
            ],
            { gutter: 12, marginBottom: 36, maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
          ),
          row(
            [
              col(100, [
                el.button("Add to allowlist", "/mint/quantum-koi/allowlist", {
                  backgroundColor: theme.onBandSurface,
                  color: theme.onBandSurfaceInk,
                  fontSize: 16,
                }),
                el.button("Read the drop", "/mint/quantum-koi", {
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
        ]),
        col(45, [
          el.image(
            "https://images.unsplash.com/photo-1633101585272-9e0b0c3d9f9e?w=1200&q=80",
            "Quantum Koi featured artwork — abstract 3d-render koi",
            {
              borderRadius: 24,
              boxShadowX: 0,
              boxShadowY: 32,
              boxShadowBlur: 64,
              // Literal by necessity: this is interpolated into a `box-shadow`
              // shorthand and the vocabulary has no shadow colour. The value is
              // already `theme.bandInk` at 40% alpha.
              boxShadowColor: "rgba(10,18,32,0.4)",
            }
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 56, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Mint Countdown Hero",
    description: "Live countdown hero for NFT mint drop with featured artwork",
    category: "nft",
    slug: "nft-mint-countdown-hero",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: gradients.indigoViolet,
    },
  }
);
