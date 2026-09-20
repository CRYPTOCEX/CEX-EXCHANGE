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

const milestone = (
  quarter: string,
  title: string,
  items: string[],
  done: boolean
): Element[] => [
  el.text(quarter, {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: "0.18em",
    color: done ? theme.emerald : theme.primary,
    marginBottom: 10,
  }),
  el.heading(title, {
    level: "h3",
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 16,
    letterSpacing: "-0.01em",
  }),
  el.list(items, {
    fontSize: 13,
    lineHeight: "1.8",
    color: theme.textMuted,
    marginBottom: 0,
  }),
  el.text(done ? "SHIPPED" : "PLANNED", {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: "0.2em",
    color: done ? theme.emerald : theme.textMuted,
    backgroundColor: done ? theme.bgMuted : theme.bgMuted,
    borderRadius: 999,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 0,
    maxWidth: "90px",
  }),
];

const milestoneSettings = {
  backgroundColor: theme.bgCard,
  borderColor: theme.border,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 18,
  padding: 24,
};

export const icoLaunchpadRoadmapTimelineIco: Section = section(
  [
    singleColumnRow([
      el.text("ROADMAP", {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: "0.18em",
        textAlign: "center",
        color: theme.primary,
        marginBottom: 12,
      }),
      el.heading("What we're building through 2026", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Public quarterly roadmap — shipped milestones stay in the timeline so you can check our pace.",
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
          milestone(
            "Q4 2025",
            "Genesis",
            ["Team assembled", "Closed seed round — $1.2M", "Testnet contracts deployed"],
            true
          ),
          milestoneSettings
        ),
        col(
          25,
          milestone(
            "Q1 2026",
            "Public sale",
            ["Audit by Spearbit", "KYC onboarding live", "TGE on Base L2", "Liquidity pools bootstrapped"],
            true
          ),
          milestoneSettings
        ),
        col(
          25,
          milestone(
            "Q2 2026",
            "Network launch",
            ["GPU provider onboarding", "Job marketplace beta", "Mobile companion app"],
            false
          ),
          milestoneSettings
        ),
        col(
          25,
          milestone(
            "Q3 2026",
            "Scale",
            ["Cross-chain bridge (Arbitrum, Optimism)", "Governance module live", "Enterprise SLAs"],
            false
          ),
          milestoneSettings
        ),
      ],
      { ...rowPresets.wide, gutter: 20, verticalAlign: "top" }
    ),
  ],
  {
    name: "Roadmap Timeline — ICO",
    description: "Four-quarter horizontal roadmap with shipped vs planned milestones",
    category: "ico-launchpad",
    slug: "ico-launchpad-roadmap-timeline-ico",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
