import type { Section, Row } from "@/types/builder";
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

const traderRow = (
  rank: number,
  name: string,
  handle: string,
  avatarSrc: string,
  roi: string,
  winRate: string,
  copiers: string,
  aum: string
): Row => {
  const medalColor =
    rank === 1
      ? theme.amber
      : rank === 2
      ? theme.textDim
      : rank === 3
      ? theme.amber
      : theme.textMuted;
  return row(
    [
      col(7, [
        el.text(`#${rank}`, {
          fontSize: 20,
          fontWeight: "800",
          color: medalColor,
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ]),
      col(33, [
        el.text(
          `<div style="display:flex;align-items:center;gap:12px;"><img src="${avatarSrc}" alt="${name} avatar" style="width:44px;height:44px;border-radius:999px;object-fit:cover;flex-shrink:0;" /><div><div style="font-size:15px;font-weight:700;color:#09090b;">${name}</div><div style="font-size:12px;color:#71717a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${handle}</div></div></div>`,
          { marginBottom: 0 }
        ),
      ]),
      col(15, [
        el.text(roi, {
          fontSize: 17,
          fontWeight: "700",
          color: theme.emerald,
          textAlign: "right",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ]),
      col(12, [
        el.text(winRate, {
          fontSize: 14,
          color: theme.text,
          textAlign: "right",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ]),
      col(13, [
        el.text(copiers, {
          fontSize: 14,
          color: theme.textMuted,
          textAlign: "right",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ]),
      col(10, [
        el.text(aum, {
          fontSize: 13,
          color: theme.textMuted,
          textAlign: "right",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ]),
      col(10, [
        el.button("Copy", `/copy/${handle.replace("@", "")}`, {
          fontSize: 13,
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 16,
          paddingRight: 16,
          marginRight: 0,
          marginTop: 0,
          width: "100%",
        }),
      ]),
    ],
    {
      ...rowPresets.wide,
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
};

export const copyTradingTopTradersLeaderboard: Section = section(
  [
    singleColumnRow([
      el.text("LEADERBOARD · 30 DAYS", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("Top 10 traders, ranked by real returns", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "All performance figures are audited live from trading history — no paid promotion, no cherry-picking.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "680px",
          marginBottom: 48,
        }
      ),
    ]),
    // Header
    row(
      [
        col(7, [
          el.text("RANK", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            marginBottom: 0,
          }),
        ]),
        col(33, [
          el.text("TRADER", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            marginBottom: 0,
          }),
        ]),
        col(15, [
          el.text("ROI (30D)", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "right",
            marginBottom: 0,
          }),
        ]),
        col(12, [
          el.text("WIN RATE", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "right",
            marginBottom: 0,
          }),
        ]),
        col(13, [
          el.text("COPIERS", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "right",
            marginBottom: 0,
          }),
        ]),
        col(10, [
          el.text("AUM", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "right",
            marginBottom: 0,
          }),
        ]),
        col(10, [
          el.text("", { marginBottom: 0 }),
        ]),
      ],
      {
        ...rowPresets.wide,
        gutter: 12,
        paddingTop: 14,
        paddingBottom: 14,
        backgroundColor: theme.bgMuted,
        borderRadius: 12,
        verticalAlign: "middle",
      }
    ),
    traderRow(1, "Alexei Volkov", "@volkov_fx", "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80", "+184.2%", "78.4%", "12,482", "$8.2M"),
    traderRow(2, "Mei Tanaka", "@mei_tanaka", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80", "+147.8%", "71.2%", "9,821", "$6.4M"),
    traderRow(3, "Diego Herrera", "@diego_trades", "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80", "+132.4%", "68.9%", "8,214", "$5.8M"),
    traderRow(4, "Priya Shah", "@priya_quant", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80", "+118.6%", "72.1%", "7,432", "$4.9M"),
    traderRow(5, "Lars Bergström", "@lars_b", "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80", "+104.8%", "65.3%", "6,284", "$4.1M"),
    traderRow(6, "Aisha Okonkwo", "@aisha_o", "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80", "+96.2%", "69.8%", "5,721", "$3.4M"),
    traderRow(7, "Ben Carter", "@bencarter", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80", "+88.4%", "63.7%", "4,982", "$2.9M"),
    traderRow(8, "Yuki Sato", "@yuki_sato", "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80", "+81.2%", "67.1%", "4,218", "$2.6M"),
    traderRow(9, "Marco Rossi", "@marco_r", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80", "+74.8%", "62.4%", "3,812", "$2.1M"),
    traderRow(10, "Sophia Chen", "@sophia_c", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80", "+68.4%", "64.2%", "3,421", "$1.9M"),
    singleColumnRow(
      [
        el.button("Browse all 4,200+ traders", "/copy-trading/leaderboard", {
          fontSize: 15,
          marginTop: 32,
          marginRight: 0,
        }),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Top Traders Leaderboard",
    description: "Ranked leaderboard of top 10 traders with ROI, win rate, and copiers",
    category: "copy-trading",
    slug: "copy-trading-top-traders-leaderboard",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
