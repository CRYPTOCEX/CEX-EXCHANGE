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

const collectionCard = (
  image: string,
  name: string,
  floor: string,
  volume: string,
  change: string,
  changePositive: boolean
): Element[] => [
  el.image(image, `${name} collection artwork`, {
    borderRadius: 16,
    marginBottom: 16,
    height: "200px",
    width: "100%",
  }),
  el.heading(name, {
    level: "h3",
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 12,
    letterSpacing: "-0.01em",
  }),
  el.text(`${floor} floor`, {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 4,
  }),
  el.text(`${volume} volume`, {
    fontSize: 13,
    color: theme.textMuted,
    marginBottom: 8,
  }),
  el.text(change, {
    fontSize: 13,
    fontWeight: "700",
    color: changePositive ? theme.emerald : theme.rose,
    marginBottom: 0,
  }),
];

const cardSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 18,
  padding: 20,
};

export const nftTopCollectionsGrid: Section = section(
  [
    singleColumnRow([
      el.text("TRENDING THIS WEEK", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.violet,
        marginBottom: 12,
      }),
      el.heading("Top collections by volume", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "The most-traded NFT collections on the platform, ranked by 7-day USDC volume.",
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
          33,
          collectionCard(
            "https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=800&q=80",
            "Cyber Apes Genesis",
            "0.45 ETH",
            "48.2K USDC",
            "+12.4%",
            true
          ),
          cardSettings
        ),
        col(
          33,
          collectionCard(
            "https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=800&q=80",
            "Genesis Proto",
            "1.20 ETH",
            "112.8K USDC",
            "+8.1%",
            true
          ),
          cardSettings
        ),
        col(
          34,
          collectionCard(
            "https://images.unsplash.com/photo-1614812513172-567d2fe96a75?w=800&q=80",
            "Neon Society",
            "0.28 ETH",
            "24.6K USDC",
            "-3.2%",
            false
          ),
          cardSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 24, marginBottom: 24, verticalAlign: "top" }
    ),
    row(
      [
        col(
          33,
          collectionCard(
            "https://images.unsplash.com/photo-1633101585272-9e0b0c3d9f9e?w=800&q=80",
            "Quantum Koi",
            "0.62 ETH",
            "36.4K USDC",
            "+22.7%",
            true
          ),
          cardSettings
        ),
        col(
          33,
          collectionCard(
            "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&q=80",
            "Voidwalkers",
            "0.92 ETH",
            "58.1K USDC",
            "+4.3%",
            true
          ),
          cardSettings
        ),
        col(
          34,
          collectionCard(
            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
            "Hollow Moons",
            "0.18 ETH",
            "14.2K USDC",
            "+1.6%",
            true
          ),
          cardSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Top Collections Grid",
    description: "Six trending NFT collection cards with floor, volume, and 7-day change",
    category: "nft",
    slug: "nft-top-collections-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
