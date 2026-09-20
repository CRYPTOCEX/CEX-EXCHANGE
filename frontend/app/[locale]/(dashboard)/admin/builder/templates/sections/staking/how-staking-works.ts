import type { Section, Element } from "@/types/builder";
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

const step = (
  number: string,
  icon: string,
  title: string,
  body: string
): Element[] => [
  el.text(number, {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: "0.18em",
    color: theme.emerald,
    marginBottom: 16,
  }),
  el.icon(icon, {
    size: 32,
    color: theme.emerald,
    marginBottom: 20,
  }),
  el.heading(title, {
    level: "h3",
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 10,
    letterSpacing: "-0.01em",
  }),
  el.text(body, {
    fontSize: 14,
    lineHeight: "1.65",
    color: theme.textMuted,
    marginBottom: 0,
  }),
];

const stepSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 16,
  padding: 28,
};

export const stakingHowStakingWorks: Section = section(
  [
    singleColumnRow([
      el.text("HOW STAKING WORKS", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.emerald,
        marginBottom: 12,
      }),
      el.heading("From wallet to yield in four moves", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Non-custodial, liquid where possible, and auditable on-chain. No lock-ins you didn't opt into.",
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
          step(
            "01",
            "lucide:arrow-down-to-line",
            "Deposit",
            "Transfer BTC, ETH, SOL, USDT, or any supported asset from spot to staking."
          ),
          stepSettings
        ),
        col(
          25,
          step(
            "02",
            "lucide:lock",
            "Lock",
            "Pick flexible or a fixed term. Longer locks earn higher APY — up to 11.8%."
          ),
          stepSettings
        ),
        col(
          25,
          step(
            "03",
            "lucide:trending-up",
            "Earn",
            "Rewards accrue every epoch and auto-compound back into your stake."
          ),
          stepSettings
        ),
        col(
          25,
          step(
            "04",
            "lucide:hand-coins",
            "Claim",
            "Withdraw rewards any time. Principal releases after your lock term ends."
          ),
          stepSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "How Staking Works",
    description: "Four-step staking flow — deposit, lock, earn, claim",
    category: "staking",
    slug: "staking-how-staking-works",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
