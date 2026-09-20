import type { Section, Element } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  gradients,
  sectionPresets,
  rowPresets,
} from "../../utils";

const statBlock = (value: string, label: string): Element[] => [
  el.heading(value, {
    level: "h3",
    fontSize: 64,
    fontWeight: "800",
    letterSpacing: "-0.03em",
    textAlign: "center",
    color: theme.onBand,
    marginBottom: 12,
  }),
  el.text(label, {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: "0.18em",
    textAlign: "center",
    color: theme.onBandMuted,
    marginBottom: 0,
  }),
];

export const stakingStakingStatsHero: Section = section(
  [
    singleColumnRow([
      el.text("PLATFORM STAKING — LIVE", {
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.onBand,
        backgroundColor: theme.onBandFill,
        borderRadius: 999,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        marginBottom: 32,
        maxWidth: "260px",
      }),
      el.heading("One billion reasons to stake", {
        level: "h1",
        fontSize: 72,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        textAlign: "center",
        lineHeight: "1.02",
        color: theme.onBand,
        marginBottom: 20,
        maxWidth: "880px",
      }),
      el.text(
        "Cumulative numbers since launch, updated in real time from the staking contracts.",
        {
          fontSize: 20,
          textAlign: "center",
          lineHeight: "1.6",
          color: theme.onBandMuted,
          maxWidth: "620px",
          marginBottom: 72,
        }
      ),
    ]),
    row(
      [
        col(33, statBlock("$1.2B", "TOTAL VALUE STAKED")),
        col(33, statBlock("240K", "UNIQUE STAKERS")),
        col(34, statBlock("$48M", "REWARDS PAID")),
      ],
      { ...rowPresets.wide, gutter: 32, verticalAlign: "top" }
    ),
  ],
  {
    name: "Staking Stats Hero",
    description: "Hero with cumulative staking platform stats",
    category: "staking",
    slug: "staking-staking-stats-hero",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: gradients.skyEmerald,
    },
  }
);
