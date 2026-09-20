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

const metricCard = (
  value: string,
  label: string,
  delta: string,
  deltaColor: ColorValue
): Element[] => [
  el.text(label, {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: "0.16em",
    color: theme.textMuted,
    marginBottom: 12,
  }),
  el.heading(value, {
    level: "h3",
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: "-0.025em",
    color: theme.text,
    marginBottom: 8,
  }),
  el.text(delta, {
    fontSize: 13,
    fontWeight: "600",
    color: deltaColor,
    marginBottom: 0,
  }),
];

const metricSettings = {
  backgroundColor: theme.bgElevated,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 18,
  padding: 32,
};

export const nftArtistRevenueStats: Section = section(
  [
    singleColumnRow([
      el.text("ARTIST ECONOMY", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.violet,
        marginBottom: 12,
      }),
      el.heading("Real numbers for real artists", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Lifetime platform stats, pulled from on-chain events and settled USDC payouts.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(
          33,
          metricCard(
            "$48.2M",
            "TOTAL SALES VOLUME",
            "▲ $6.1M last 30 days",
            theme.emerald
          ),
          metricSettings
        ),
        col(
          33,
          metricCard(
            "$12.4M",
            "ROYALTIES PAID",
            "▲ $1.4M last 30 days",
            theme.emerald
          ),
          metricSettings
        ),
        col(
          34,
          metricCard(
            "2,480",
            "ACTIVE ARTISTS",
            "▲ 184 new this month",
            theme.emerald
          ),
          metricSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Artist Revenue Stats",
    description: "Three lifetime NFT stats — volume, royalties paid, active artists",
    category: "nft",
    slug: "nft-artist-revenue-stats",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
