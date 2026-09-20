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

type Merchant = {
  rank: number;
  handle: string;
  country: string;
  trades: string;
  completion: string;
  volume: string;
  verified: boolean;
};

const merchants: Merchant[] = [
  { rank: 1, handle: "@cryptoking_eu", country: "Germany", trades: "18,412", completion: "99.8%", volume: "$24.1M", verified: true },
  { rank: 2, handle: "@lagos_trader", country: "Nigeria", trades: "14,203", completion: "99.6%", volume: "$19.3M", verified: true },
  { rank: 3, handle: "@manila_exchange", country: "Philippines", trades: "12,847", completion: "99.7%", volume: "$17.8M", verified: true },
  { rank: 4, handle: "@nairobi_cash", country: "Kenya", trades: "11,209", completion: "99.4%", volume: "$15.2M", verified: true },
  { rank: 5, handle: "@london_otc", country: "UK", trades: "9,841", completion: "99.9%", volume: "$14.7M", verified: true },
];

const merchantRow = (m: Merchant) =>
  row(
    [
      col(8, [
        el.text(`#${m.rank}`, {
          fontSize: 16,
          fontWeight: "800",
          color: m.rank <= 3 ? theme.amber : theme.textMuted,
          marginBottom: 0,
        }),
      ]),
      col(
        28,
        [
          el.heading(m.handle, {
            level: "h4",
            fontSize: 16,
            fontWeight: "700",
            color: theme.text,
            marginBottom: 4,
          }),
          el.text(`${m.country}${m.verified ? " · Verified" : ""}`, {
            fontSize: 12,
            color: m.verified ? theme.emerald : theme.textMuted,
            marginBottom: 0,
          }),
        ]
      ),
      col(18, [
        el.text("Trades", {
          fontSize: 11,
          color: theme.textDim,
          letterSpacing: "0.08em",
          marginBottom: 4,
        }),
        el.text(m.trades, { fontSize: 15, fontWeight: "700", color: theme.text, marginBottom: 0 }),
      ]),
      col(18, [
        el.text("Completion", {
          fontSize: 11,
          color: theme.textDim,
          letterSpacing: "0.08em",
          marginBottom: 4,
        }),
        el.text(m.completion, { fontSize: 15, fontWeight: "700", color: theme.emerald, marginBottom: 0 }),
      ]),
      col(18, [
        el.text("30d volume", {
          fontSize: 11,
          color: theme.textDim,
          letterSpacing: "0.08em",
          marginBottom: 4,
        }),
        el.text(m.volume, { fontSize: 15, fontWeight: "700", color: theme.text, marginBottom: 0 }),
      ]),
      col(10, [
        el.button("Trade", `/p2p/merchant/${m.rank}`, {
          backgroundColor: theme.cssPrimary,
          color: theme.cssPrimaryInk,
          fontSize: 13,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 16,
          paddingRight: 16,
          marginRight: 0,
          marginTop: 0,
        }),
      ]),
    ],
    {
      ...rowPresets.wide,
      maxWidth: "1040px",
      gutter: 12,
      paddingTop: 20,
      paddingBottom: 20,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.bgCard,
      marginBottom: 10,
      verticalAlign: "middle",
    }
  );

export const p2pTopMerchantsLeaderboard: Section = section(
  [
    singleColumnRow([
      el.text("TRUSTED MERCHANTS", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.amber,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("Top merchants, ranked", {
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
        "Every merchant is KYC-verified. Rankings are based on completion rate, trade count, and 30-day volume.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 48,
          lineHeight: "1.6",
        }
      ),
    ]),
    ...merchants.map(merchantRow),
    singleColumnRow(
      [
        el.button("View full leaderboard", "/p2p/merchants", {
          backgroundColor: theme.cssSurface3,
          color: theme.cssForeground,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.border,
          marginTop: 16,
          marginRight: 0,
        }),
      ],
      { textAlign: "center", maxWidth: "1040px" }
    ),
  ],
  {
    name: "Top Merchants Leaderboard",
    description: "Ranked P2P merchants with completion rate and 30d volume",
    category: "p2p",
    slug: "p2p-top-merchants-leaderboard",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
