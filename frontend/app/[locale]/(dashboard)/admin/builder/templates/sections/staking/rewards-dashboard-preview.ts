import type { Section, Element } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

const statLine = (label: string, value: string): Element[] => [
  el.text(
    `<span style="display:inline-block;width:60%;opacity:0.75">${label}</span><span style="display:inline-block;width:40%;text-align:right;font-weight:700;color:currentColor">${value}</span>`,
    {
      fontSize: 13,
      color: theme.text,
      marginBottom: 14,
      lineHeight: "1.5",
    }
  ),
];

export const stakingRewardsDashboardPreview: Section = section(
  [
    row(
      [
        col(45, [
          el.text("REWARDS DASHBOARD", {
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: "0.18em",
            color: theme.emerald,
            marginBottom: 12,
          }),
          el.heading("Watch rewards compound in real time", {
            fontSize: 48,
            fontWeight: "800",
            letterSpacing: "-0.03em",
            lineHeight: "1.05",
            color: theme.text,
            marginBottom: 20,
          }),
          el.text(
            "Your staked balance, pending rewards, next unlock, and claimable yield — all on one screen. Claim any time with a single click.",
            {
              fontSize: 18,
              lineHeight: "1.65",
              color: theme.textMuted,
              marginBottom: 36,
              maxWidth: "460px",
            }
          ),
          el.list(
            [
              "Live reward ticker at epoch cadence",
              "One-click claim to spot wallet",
              "Auto-compound toggle per pool",
              "Tax-ready CSV export",
            ],
            {
              fontSize: 15,
              lineHeight: "1.9",
              color: theme.text,
              marginBottom: 32,
            }
          ),
          el.button("Open dashboard", "/staking/dashboard", {
            backgroundColor: theme.cssSuccess,
            fontSize: 16,
          }),
        ]),
        col(
          55,
          [
            el.text("STAKED BALANCE", {
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: "0.16em",
              color: theme.textMuted,
              marginBottom: 10,
            }),
            el.heading("$20,482.64", {
              level: "h3",
              fontSize: 44,
              fontWeight: "800",
              letterSpacing: "-0.025em",
              color: theme.text,
              marginBottom: 8,
            }),
            el.text("8.12 ETH · 4 active pools", {
              fontSize: 13,
              color: theme.textMuted,
              marginBottom: 28,
            }),
            el.divider({ marginTop: 0, marginBottom: 24, borderColor: theme.border }),
            el.text("PENDING REWARDS", {
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: "0.16em",
              color: theme.textMuted,
              marginBottom: 10,
            }),
            el.heading("$184.22", {
              level: "h4",
              fontSize: 28,
              fontWeight: "800",
              letterSpacing: "-0.02em",
              color: theme.emerald,
              marginBottom: 20,
            }),
            el.button("Claim rewards", "/staking/claim", {
              backgroundColor: theme.cssSuccess,
              fontSize: 14,
              width: "100%",
              textAlign: "center",
              marginTop: 0,
              marginRight: 0,
              marginBottom: 28,
            }),
            el.divider({ marginTop: 0, marginBottom: 20, borderColor: theme.border }),
            ...statLine("Auto-compound", "Enabled"),
            ...statLine("Next reward epoch", "2h 14m"),
            ...statLine("Earned (30d)", "+$512.48"),
            ...statLine("Lifetime earned", "+$3,842.11"),
          ],
          {
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
            borderWidth: 1,
            borderStyle: "solid",
            borderRadius: 22,
            paddingTop: 36,
            paddingBottom: 36,
            paddingLeft: 36,
            paddingRight: 36,
            boxShadowX: 0,
            boxShadowY: 24,
            boxShadowBlur: 48,
            boxShadowColor: "rgba(10,18,32,0.1)",
          }
        ),
      ],
      { ...rowPresets.wide, gutter: 56, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Rewards Dashboard Preview",
    description: "Mock staking dashboard with balance, pending rewards, and claim button",
    category: "staking",
    slug: "staking-rewards-dashboard-preview",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
