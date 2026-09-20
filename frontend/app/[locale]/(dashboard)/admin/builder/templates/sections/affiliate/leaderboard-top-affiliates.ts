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

type Affiliate = {
  rank: number;
  handle: string;
  channel: string;
  referrals: string;
  earnings: string;
};

const affiliates: Affiliate[] = [
  { rank: 1, handle: "CryptoCharlotte", channel: "YouTube · 412k subs", referrals: "8,412", earnings: "$87,240" },
  { rank: 2, handle: "TradingWithRaj", channel: "X / Twitter · 218k", referrals: "6,204", earnings: "$64,180" },
  { rank: 3, handle: "HODLHarbor", channel: "Newsletter · 92k", referrals: "5,811", earnings: "$58,720" },
  { rank: 4, handle: "LeoOnChain", channel: "TikTok · 312k", referrals: "4,902", earnings: "$46,500" },
  { rank: 5, handle: "DeFiDigest", channel: "Podcast · 140k", referrals: "4,128", earnings: "$39,800" },
  { rank: 6, handle: "MashMaven", channel: "Blog · 68k/mo", referrals: "3,892", earnings: "$36,220" },
  { rank: 7, handle: "AltcoinAlma", channel: "Instagram · 180k", referrals: "3,415", earnings: "$31,400" },
  { rank: 8, handle: "ChartChaser", channel: "Discord · 22k", referrals: "3,108", earnings: "$28,950" },
  { rank: 9, handle: "MarketMinh", channel: "Substack · 54k", referrals: "2,842", earnings: "$26,180" },
  { rank: 10, handle: "SatoshiSiren", channel: "Telegram · 98k", referrals: "2,601", earnings: "$23,720" },
];

const rankBadge = (rank: number) => {
  const color = rank === 1 ? theme.amber : rank === 2 ? theme.textMuted : rank === 3 ? theme.amber : theme.textDim;
  return el.heading(`#${rank}`, {
    level: "h4",
    fontSize: 20,
    fontWeight: "800",
    color,
    marginBottom: 0,
    textAlign: "center",
  });
};

const affiliateRow = (a: Affiliate) =>
  row(
    [
      col(10, [rankBadge(a.rank)]),
      col(35, [
        el.heading(a.handle, {
          level: "h4",
          fontSize: 16,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 4,
        }),
        el.text(a.channel, {
          fontSize: 12,
          color: theme.textMuted,
          marginBottom: 0,
        }),
      ]),
      col(22, [
        el.text("Referrals", {
          fontSize: 11,
          color: theme.textDim,
          letterSpacing: "0.1em",
          marginBottom: 4,
        }),
        el.text(a.referrals, { fontSize: 15, fontWeight: "700", color: theme.text, marginBottom: 0 }),
      ]),
      col(23, [
        el.text("Quarter earnings", {
          fontSize: 11,
          color: theme.textDim,
          letterSpacing: "0.1em",
          marginBottom: 4,
        }),
        el.text(a.earnings, { fontSize: 15, fontWeight: "700", color: theme.emerald, marginBottom: 0 }),
      ]),
      col(10, [
        el.icon("lucide:trending-up", { size: 22, color: theme.emerald, marginBottom: 0 }),
      ], { textAlign: "right" }),
    ],
    {
      ...rowPresets.wide,
      maxWidth: "1000px",
      gutter: 12,
      paddingTop: 18,
      paddingBottom: 18,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.bgCard,
      marginBottom: 10,
      verticalAlign: "middle",
    }
  );

export const affiliateLeaderboardTopAffiliates: Section = section(
  [
    singleColumnRow([
      el.text("TOP 10 THIS QUARTER", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.amber,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("The highest-earning affiliates", {
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
        "Ranked by Q1 commission earnings. The leaderboard resets every quarter — new affiliates routinely crack the top 20 in their first month.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "660px",
          marginBottom: 48,
          lineHeight: "1.6",
        }
      ),
    ]),
    ...affiliates.map(affiliateRow),
  ],
  {
    name: "Top Affiliates Leaderboard",
    description: "Ranked list of top 10 affiliates by quarterly earnings",
    category: "affiliate",
    slug: "affiliate-leaderboard-top-affiliates",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
