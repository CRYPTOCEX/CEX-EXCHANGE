import type { Section, Element } from "@/types/builder";
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

const miniCard = (
  image: string,
  name: string,
  floor: string,
  change: string,
  positive: boolean
): Element[] => [
  el.image(image, `${name} NFT thumbnail`, {
    borderRadius: 14,
    marginBottom: 12,
    height: "140px",
    width: "100%",
  }),
  el.text(name, {
    fontSize: 14,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 4,
  }),
  el.text(`${floor} floor`, {
    fontSize: 12,
    color: theme.textMuted,
    marginBottom: 4,
  }),
  el.text(change, {
    fontSize: 12,
    fontWeight: "700",
    color: positive ? theme.emerald : theme.rose,
    marginBottom: 0,
  }),
];

const chipSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 16,
  padding: 14,
};

export const nftTrendingNowScroll: Section = section(
  [
    row(
      [
        col(70, [
          el.text("LIVE MARKET", {
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: "0.18em",
            color: theme.violet,
            marginBottom: 10,
          }),
          el.heading("Trending now", {
            fontSize: 36,
            fontWeight: "800",
            letterSpacing: "-0.02em",
            color: theme.text,
            marginBottom: 0,
          }),
        ]),
        col(30, [
          el.link("View all collections →", "/nft/collections", {
            fontSize: 15,
            fontWeight: "600",
            color: theme.violet,
            textAlign: "right",
          }),
        ]),
      ],
      { ...rowPresets.wide, marginBottom: 40, verticalAlign: "middle" }
    ),
    row(
      [
        col(
          20,
          miniCard(
            "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=600&q=80",
            "Cyber Apes #4821",
            "0.45 ETH",
            "+12.4%",
            true
          ),
          chipSettings
        ),
        col(
          20,
          miniCard(
            "https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=600&q=80",
            "Genesis Proto #112",
            "1.20 ETH",
            "+8.1%",
            true
          ),
          chipSettings
        ),
        col(
          20,
          miniCard(
            "https://images.unsplash.com/photo-1614812513172-567d2fe96a75?w=600&q=80",
            "Neon Society #09",
            "0.28 ETH",
            "-3.2%",
            false
          ),
          chipSettings
        ),
        col(
          20,
          miniCard(
            "https://images.unsplash.com/photo-1633101585272-9e0b0c3d9f9e?w=600&q=80",
            "Quantum Koi #217",
            "0.62 ETH",
            "+22.7%",
            true
          ),
          chipSettings
        ),
        col(
          20,
          miniCard(
            "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=600&q=80",
            "Voidwalkers #64",
            "0.92 ETH",
            "+4.3%",
            true
          ),
          chipSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 16, verticalAlign: "top" }
    ),
  ],
  {
    name: "Trending Now Scroll",
    description: "Horizontal strip of trending NFT cards with live pricing",
    category: "nft",
    slug: "nft-trending-now-scroll",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
