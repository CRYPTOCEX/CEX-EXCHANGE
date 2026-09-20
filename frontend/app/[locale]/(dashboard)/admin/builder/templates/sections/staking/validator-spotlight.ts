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

const validatorStat = (value: string, label: string): Element[] => [
  el.heading(value, {
    level: "h4",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: "-0.025em",
    color: theme.text,
    marginBottom: 6,
  }),
  el.text(label, {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: "0.16em",
    color: theme.textMuted,
    marginBottom: 0,
  }),
];

const validatorStatSettings = {
  backgroundColor: theme.bgElevated,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 14,
  padding: 24,
};

export const stakingValidatorSpotlight: Section = section(
  [
    row(
      [
        col(40, [
          el.text("VALIDATOR SPOTLIGHT", {
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: "0.18em",
            color: theme.emerald,
            marginBottom: 12,
          }),
          el.heading("Staking Labs — ETH validator #04712", {
            fontSize: 40,
            fontWeight: "800",
            letterSpacing: "-0.025em",
            color: theme.text,
            marginBottom: 20,
            lineHeight: "1.1",
          }),
          el.text(
            "Operated out of Frankfurt and Singapore on dedicated bare-metal. 18 months of uninterrupted signing, zero slashing events on record.",
            {
              fontSize: 17,
              lineHeight: "1.65",
              color: theme.textMuted,
              marginBottom: 28,
              maxWidth: "440px",
            }
          ),
          el.list(
            [
              "MEV-Boost enabled across 4 relays",
              "Slashing insurance up to 5 ETH",
              "Non-custodial delegation, withdraw any epoch",
            ],
            {
              fontSize: 15,
              lineHeight: "1.9",
              color: theme.text,
              marginBottom: 32,
            }
          ),
          el.button("Delegate to Staking Labs", "/staking/validator/04712", {
            backgroundColor: theme.cssSuccess,
            color: theme.cssSuccessInk,
            fontSize: 15,
          }),
        ]),
        colR(60, [], [
          row(
            [
              col(50, validatorStat("99.98%", "UPTIME (12M)"), validatorStatSettings),
              col(50, validatorStat("5%", "COMMISSION"), validatorStatSettings),
            ],
            { gutter: 20, marginBottom: 20, verticalAlign: "top", maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
          ),
          row(
            [
              col(50, validatorStat("12,840", "ACTIVE DELEGATORS"), validatorStatSettings),
              col(50, validatorStat("$48.2M", "STAKED WITH US"), validatorStatSettings),
            ],
            { gutter: 20, marginBottom: 20, verticalAlign: "top", maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
          ),
          row(
            [
              col(50, validatorStat("5.32%", "NET APY TO STAKERS"), validatorStatSettings),
              col(50, validatorStat("0", "SLASHING EVENTS"), validatorStatSettings),
            ],
            { gutter: 20, verticalAlign: "top", maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 56, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Validator Spotlight",
    description: "Featured validator with uptime, commission, and delegator stats",
    category: "staking",
    slug: "staking-validator-spotlight",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
