import type { Section, Element, ColorValue } from "@/types/builder";
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

const rarityTile = (
  tier: string,
  count: string,
  percent: string,
  floor: string,
  accent: ColorValue,
  sample: string
): Element[] => [
  el.image(sample, `${tier} tier sample artwork`, {
    borderRadius: 12,
    marginBottom: 20,
    height: "160px",
    width: "100%",
  }),
  el.text(tier.toUpperCase(), {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: "0.18em",
    color: accent,
    marginBottom: 10,
  }),
  el.heading(count, {
    level: "h3",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: "-0.02em",
    color: theme.text,
    marginBottom: 4,
  }),
  el.text(`${percent} of supply`, {
    fontSize: 13,
    color: theme.textMuted,
    marginBottom: 16,
  }),
  el.divider({ marginTop: 0, marginBottom: 16, borderColor: theme.border }),
  el.text("FLOOR", {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: "0.14em",
    color: theme.textMuted,
    marginBottom: 4,
  }),
  el.text(floor, {
    fontSize: 16,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 0,
  }),
];

const tierSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 18,
  padding: 24,
};

export const nftRarityShowcase: Section = section(
  [
    singleColumnRow([
      el.text("RARITY TIERS", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.violet,
        marginBottom: 12,
      }),
      el.heading("Every Ape has a rarity", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      // NOT "unlock private events, airdrops, and governance weight".
      //
      // This is default copy an operator drops onto a live page from the
      // admin builder, and that sentence is close to verbatim the claim Apple
      // prohibits: an NFT may not unlock features or benefits. It describes
      // RARITY now, which is what the section is actually showing, and makes
      // no promise about what ownership entitles anybody to.
      el.text(
        "Traits are weighted across four tiers, so some combinations are far scarcer than others.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(
          25,
          rarityTile(
            "Common",
            "7,200",
            "72%",
            "0.45 ETH",
            theme.textMuted,
            "https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=600&q=80"
          ),
          tierSettings
        ),
        col(
          25,
          rarityTile(
            "Rare",
            "2,000",
            "20%",
            "0.92 ETH",
            theme.sky,
            "https://images.unsplash.com/photo-1614812513172-567d2fe96a75?w=600&q=80"
          ),
          tierSettings
        ),
        col(
          25,
          rarityTile(
            "Epic",
            "700",
            "7%",
            "2.40 ETH",
            theme.violet,
            "https://images.unsplash.com/photo-1633101585272-9e0b0c3d9f9e?w=600&q=80"
          ),
          tierSettings
        ),
        col(
          25,
          rarityTile(
            "Legendary",
            "100",
            "1%",
            "12.80 ETH",
            theme.amber,
            "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=600&q=80"
          ),
          tierSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Rarity Showcase",
    description: "Four NFT rarity tiers with sample artwork and floor prices",
    category: "nft",
    slug: "nft-rarity-showcase",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
