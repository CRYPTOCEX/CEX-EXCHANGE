import type { Section, Element, Column, Row } from "@/types/builder";
import { generateId } from "@/store/builder-store";
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

const stepNode = (
  number: string,
  title: string,
  value: string
): Element[] => [
  el.text(number, {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: "0.18em",
    color: theme.emerald,
    marginBottom: 10,
    textAlign: "center",
  }),
  el.text(title, {
    fontSize: 13,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 8,
    textAlign: "center",
  }),
  el.heading(value, {
    level: "h4",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: "-0.02em",
    color: theme.text,
    marginBottom: 0,
    textAlign: "center",
  }),
];

const stepNodeSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.emerald,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 16,
  padding: 24,
};

const benefitRow = (
  icon: string,
  title: string,
  body: string
): Element[] => [
  el.icon(icon, {
    size: 24,
    color: theme.emerald,
    marginBottom: 10,
  }),
  el.heading(title, {
    level: "h4",
    fontSize: 16,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 6,
    letterSpacing: "-0.005em",
  }),
  el.text(body, {
    fontSize: 14,
    lineHeight: "1.6",
    color: theme.textMuted,
    marginBottom: 24,
  }),
];

export const stakingAutoCompoundFeature: Section = section(
  [
    row(
      [
        col(45, [
          el.text("AUTO-COMPOUND", {
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: "0.18em",
            color: theme.emerald,
            marginBottom: 12,
          }),
          el.heading("Every epoch, rewards compound back in", {
            fontSize: 44,
            fontWeight: "800",
            letterSpacing: "-0.025em",
            color: theme.text,
            marginBottom: 20,
            lineHeight: "1.1",
          }),
          el.text(
            "Compounding happens automatically on-chain — no manual claims, no gas from you. Switch it off any time.",
            {
              fontSize: 17,
              lineHeight: "1.65",
              color: theme.textMuted,
              marginBottom: 32,
              maxWidth: "440px",
            }
          ),
          ...benefitRow(
            "lucide:zap",
            "Zero friction",
            "Claim and restake in one atomic transaction. Platform pays the gas."
          ),
          ...benefitRow(
            "lucide:trending-up",
            "Higher effective APY",
            "Compounding every epoch turns 8.1% APR into 8.42% APY on USDT."
          ),
          ...benefitRow(
            "lucide:shield",
            "Non-custodial",
            "Your principal and rewards never leave the staking contract you opted into."
          ),
        ]),
        colR(55, [
          el.text("EXAMPLE — $10,000 at 9.2% for 180 days", {
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: "0.16em",
            textAlign: "center",
            color: theme.textMuted,
            marginBottom: 32,
          }),
        ], [
          row(
            [
              col(33, stepNode("DAY 0", "Deposit", "$10,000"), stepNodeSettings),
              col(33, stepNode("DAY 90", "Compounded", "$10,461"), stepNodeSettings),
              col(34, stepNode("DAY 180", "Claimable", "$10,944"), stepNodeSettings),
            ],
            { gutter: 16, marginBottom: 32, verticalAlign: "top", maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
          ),
          row(
            [
              col(100, [
                el.text(
                  "Same 9.2% rate, reinvested each epoch. Manual claim at 180d would yield $10,460 — compounding adds $484.",
                  {
                    fontSize: 14,
                    textAlign: "center",
                    color: theme.textMuted,
                    maxWidth: "480px",
                    marginBottom: 0,
                  }
                ),
              ]),
            ],
            { gutter: 0, maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 56, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Auto-compound Feature",
    description: "Explanation of auto-compound mechanics with example flow diagram",
    category: "staking",
    slug: "staking-auto-compound-feature",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
