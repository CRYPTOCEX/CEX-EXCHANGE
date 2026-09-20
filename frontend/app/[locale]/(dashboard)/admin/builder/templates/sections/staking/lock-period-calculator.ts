import type { Section, Element, Column, Row } from "@/types/builder";
import { generateId } from "@/store/builder-store";
import {
  el,
  row,
  col,
  section,
  theme,
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

const periodOption = (
  period: string,
  apy: string,
  selected: boolean
): Element[] => [
  el.heading(period, {
    level: "h4",
    fontSize: 18,
    fontWeight: "700",
    color: selected ? theme.primaryText : theme.text,
    marginBottom: 6,
    letterSpacing: "-0.01em",
    textAlign: "center",
  }),
  el.text(apy, {
    fontSize: 13,
    fontWeight: "700",
    color: selected ? theme.onBandMuted : theme.emerald,
    marginBottom: 0,
    textAlign: "center",
  }),
];

const periodSettings = (selected: boolean) => ({
  backgroundColor: selected ? theme.emerald : theme.bgCard,
  borderColor: selected ? theme.emerald : theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 14,
  paddingTop: 20,
  paddingBottom: 20,
  paddingLeft: 16,
  paddingRight: 16,
});

const rewardRow = (label: string, value: string, accent = false): Element[] => {
  // Raw HTML `style` — real CSS, so it takes the token string directly.
  const valueColor = accent ? theme.cssSuccess : "currentColor";
  return [
    el.text(
      `<span style="display:inline-block;width:60%;opacity:0.75">${label}</span><span style="display:inline-block;width:40%;text-align:right;font-weight:${accent ? "800" : "600"};color:${valueColor};font-size:${accent ? 18 : 14}px;letter-spacing:${accent ? "-0.01em" : "normal"}">${value}</span>`,
      {
        fontSize: 14,
        color: theme.text,
        marginBottom: accent ? 0 : 16,
        lineHeight: "1.5",
      }
    ),
  ];
};

export const stakingLockPeriodCalculator: Section = section(
  [
    row(
      [
        colR(50, [
          el.text("CALCULATOR", {
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: "0.18em",
            color: theme.emerald,
            marginBottom: 12,
          }),
          el.heading("Pick a lock. See the reward.", {
            fontSize: 44,
            fontWeight: "800",
            letterSpacing: "-0.025em",
            color: theme.text,
            marginBottom: 20,
            lineHeight: "1.1",
          }),
          el.text(
            "Longer locks earn higher APY. Rewards accrue every block and auto-compound unless you opt out.",
            {
              fontSize: 17,
              lineHeight: "1.65",
              color: theme.textMuted,
              marginBottom: 32,
              maxWidth: "480px",
            }
          ),
          el.text("LOCK DURATION", {
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: "0.16em",
            color: theme.textMuted,
            marginBottom: 16,
          }),
        ], [
          row(
            [
              col(25, periodOption("Flex", "4.5%", false), periodSettings(false)),
              col(25, periodOption("30d", "6.8%", false), periodSettings(false)),
              col(25, periodOption("90d", "9.2%", true), periodSettings(true)),
              col(25, periodOption("180d", "11.5%", false), periodSettings(false)),
            ],
            { gutter: 10, marginBottom: 0, verticalAlign: "top", maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
          ),
        ]),
        col(
          50,
          [
            el.text("ESTIMATED REWARDS", {
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: "0.16em",
              color: theme.textMuted,
              marginBottom: 20,
            }),
            el.heading("$1,842.64", {
              level: "h3",
              fontSize: 48,
              fontWeight: "800",
              letterSpacing: "-0.025em",
              color: theme.text,
              marginBottom: 4,
            }),
            el.text("on $20,000 staked · 90-day lock · 9.2% APY", {
              fontSize: 13,
              color: theme.textMuted,
              marginBottom: 28,
            }),
            el.divider({ marginTop: 0, marginBottom: 24, borderColor: theme.border }),
            ...rewardRow("Deposit", "$20,000.00"),
            ...rewardRow("Lock period", "90 days"),
            ...rewardRow("Variable APY", "9.2%"),
            ...rewardRow("Compound interest", "Daily"),
            el.divider({ marginTop: 8, marginBottom: 20, borderColor: theme.border }),
            ...rewardRow("Estimated reward", "+$1,842.64", true),
            el.button("Stake now", "/staking/start", {
              backgroundColor: theme.cssSuccess,
              // `el.button` defaults `color` to `cssPrimaryInk`; on a success
              // ground the paired ink is `cssSuccessInk`. Byte-identical in both
              // themes today, but it stops tracking `--primary-foreground` if
              // that ever forks from `--success-foreground`.
              color: theme.cssSuccessInk,
              fontSize: 15,
              marginTop: 28,
              width: "100%",
              textAlign: "center",
            }),
          ],
          {
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
            borderWidth: 1,
            borderStyle: "solid",
            borderRadius: 20,
            paddingTop: 36,
            paddingBottom: 36,
            paddingLeft: 36,
            paddingRight: 36,
          }
        ),
      ],
      { ...rowPresets.wide, gutter: 56, verticalAlign: "top" }
    ),
  ],
  {
    name: "Lock Period Calculator",
    description: "Lock duration selector with live rewards preview card",
    category: "staking",
    slug: "staking-lock-period-calculator",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
