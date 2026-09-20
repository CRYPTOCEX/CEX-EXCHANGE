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

type Pair = {
  crypto: string;
  fiat: string;
  price: string;
  offers: string;
  volume: string;
  change: string;
  up: boolean;
};

const pairs: Pair[] = [
  { crypto: "BTC", fiat: "USD", price: "$68,412.30", offers: "3,218", volume: "$142M", change: "+2.14%", up: true },
  { crypto: "ETH", fiat: "EUR", price: "€3,124.80", offers: "2,094", volume: "$89M", change: "+1.82%", up: true },
  { crypto: "USDT", fiat: "GBP", price: "£0.79", offers: "4,812", volume: "$78M", change: "-0.04%", up: false },
  { crypto: "USDT", fiat: "NGN", price: "₦1,612.00", offers: "5,201", volume: "$61M", change: "+0.22%", up: true },
  { crypto: "USDT", fiat: "INR", price: "₹83.21", offers: "3,904", volume: "$54M", change: "+0.08%", up: true },
  { crypto: "USDT", fiat: "KES", price: "KSh 129.40", offers: "1,732", volume: "$22M", change: "-0.12%", up: false },
  { crypto: "USDT", fiat: "PHP", price: "₱57.10", offers: "2,118", volume: "$31M", change: "+0.15%", up: true },
  { crypto: "BNB", fiat: "USD", price: "$582.40", offers: "1,047", volume: "$19M", change: "+3.21%", up: true },
];

const pairRow = (p: Pair) =>
  row(
    [
      col(18, [
        el.heading(`${p.crypto}/${p.fiat}`, {
          level: "h4",
          fontSize: 15,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 0,
        }),
      ]),
      col(22, [
        el.text(p.price, {
          fontSize: 15,
          fontWeight: "600",
          color: theme.text,
          marginBottom: 0,
        }),
      ]),
      col(18, [
        el.text(p.change, {
          fontSize: 13,
          fontWeight: "700",
          color: p.up ? theme.emerald : theme.rose,
          marginBottom: 0,
        }),
      ]),
      col(18, [
        el.text(p.offers, {
          fontSize: 14,
          color: theme.textMuted,
          marginBottom: 0,
        }),
      ]),
      col(14, [
        el.text(p.volume, {
          fontSize: 14,
          color: theme.textMuted,
          marginBottom: 0,
        }),
      ]),
      col(10, [
        el.button("Trade", `/p2p/trade/${p.crypto.toLowerCase()}-${p.fiat.toLowerCase()}`, {
          backgroundColor: theme.cssPrimary,
          color: theme.cssPrimaryInk,
          fontSize: 12,
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 14,
          paddingRight: 14,
          marginRight: 0,
          marginTop: 0,
        }),
      ]),
    ],
    {
      ...rowPresets.wide,
      maxWidth: "1040px",
      gutter: 12,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottom: true,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      verticalAlign: "middle",
    }
  );

export const p2pPopularPairsTable: Section = section(
  [
    singleColumnRow([
      el.text("POPULAR PAIRS", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("The pairs people trade most", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.025em",
        lineHeight: "1.1",
      }),
      el.text(
        "Live P2P pair prices, sorted by 24-hour volume across all regions.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "600px",
          marginBottom: 48,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(18, [
          el.text("Pair", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textDim,
            letterSpacing: "0.12em",
            marginBottom: 0,
          }),
        ]),
        col(22, [el.text("Price", { fontSize: 11, fontWeight: "700", color: theme.textDim, letterSpacing: "0.12em", marginBottom: 0 })]),
        col(18, [el.text("24h change", { fontSize: 11, fontWeight: "700", color: theme.textDim, letterSpacing: "0.12em", marginBottom: 0 })]),
        col(18, [el.text("Open offers", { fontSize: 11, fontWeight: "700", color: theme.textDim, letterSpacing: "0.12em", marginBottom: 0 })]),
        col(14, [el.text("Volume", { fontSize: 11, fontWeight: "700", color: theme.textDim, letterSpacing: "0.12em", marginBottom: 0 })]),
        col(10, [el.text("", { marginBottom: 0 })]),
      ],
      {
        ...rowPresets.wide,
        maxWidth: "1040px",
        gutter: 12,
        paddingTop: 14,
        paddingBottom: 14,
        backgroundColor: theme.bgMuted,
        borderRadius: 12,
        verticalAlign: "middle",
        marginBottom: 4,
      }
    ),
    ...pairs.map(pairRow),
  ],
  {
    name: "Popular Pairs Table",
    description: "Live P2P crypto-fiat pair table with price, change, offers, volume",
    category: "p2p",
    slug: "p2p-popular-pairs-table",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
