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

const tierCard = (
  tier: string,
  threshold: string,
  bonus: string,
  accent: ColorValue,
  perks: string[]
): Element[] => [
  el.text(tier.toUpperCase(), {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: "0.18em",
    color: accent,
    marginBottom: 10,
  }),
  el.heading(threshold, {
    level: "h3",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: "-0.02em",
    color: theme.text,
    marginBottom: 6,
  }),
  el.text(bonus, {
    fontSize: 13,
    fontWeight: "600",
    color: theme.emerald,
    marginBottom: 24,
  }),
  el.divider({ marginTop: 0, marginBottom: 20, borderColor: theme.border }),
  el.list(perks, {
    fontSize: 14,
    lineHeight: "1.85",
    color: theme.text,
    marginBottom: 0,
  }),
];

const tierSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 18,
  padding: 28,
};

export const stakingTieredRewardsBenefits: Section = section(
  [
    singleColumnRow([
      el.text("TIERED REWARDS", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.emerald,
        marginBottom: 12,
      }),
      el.heading("More staked, more unlocked", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Benefits scale with your staked balance. Every tier stacks on the previous.",
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
          25,
          tierCard(
            "Bronze",
            "$1,000+",
            "+0.5% APY bonus",
            theme.amber,
            [
              "Reduced trading fees (0.08%)",
              "Basic email support",
              "Monthly yield digest",
            ]
          ),
          tierSettings
        ),
        col(
          25,
          tierCard(
            "Silver",
            "$10,000+",
            "+1.0% APY bonus",
            theme.textMuted,
            [
              "Trading fees at 0.06%",
              "Priority support",
              "Early pool access",
              "Bronze perks",
            ]
          ),
          tierSettings
        ),
        col(
          25,
          tierCard(
            "Gold",
            "$50,000+",
            "+1.8% APY bonus",
            theme.amber,
            [
              "Trading fees at 0.04%",
              "Dedicated account manager",
              "Early access to new pools",
              "Silver perks",
            ]
          ),
          tierSettings
        ),
        col(
          25,
          tierCard(
            "Platinum",
            "$250,000+",
            "+2.5% APY bonus",
            theme.violet,
            [
              "Zero trading fees",
              "Governance voting weight",
              "Invites to annual summit",
              "Gold perks",
            ]
          ),
          tierSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 20, verticalAlign: "top" }
    ),
  ],
  {
    name: "Tiered Rewards & Benefits",
    description: "Four staker tiers — Bronze, Silver, Gold, Platinum — with escalating perks",
    category: "staking",
    slug: "staking-tiered-rewards-benefits",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
