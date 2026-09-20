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

type Milestone = {
  quarter: string;
  status: "shipped" | "in-progress" | "planned";
  title: string;
  body: string;
};

const milestones: Milestone[] = [
  {
    quarter: "Q1 2026",
    status: "shipped",
    title: "Mash AI 3.0 launch",
    body: "New base model trained on 14 years of market data with cross-asset reasoning. 31% faster response time, 18% better accuracy.",
  },
  {
    quarter: "Q2 2026",
    status: "in-progress",
    title: "Voice-native trading assistant",
    body: "Hands-free strategy queries and portfolio check-ins via iOS & Android apps. Live latency target: under 900ms round-trip.",
  },
  {
    quarter: "Q3 2026",
    status: "planned",
    title: "Autonomous portfolio agents",
    body: "Opt-in agents that execute user-defined strategies within guardrails. Fully auditable, revocable, and sandboxed.",
  },
  {
    quarter: "Q4 2026",
    status: "planned",
    title: "On-device inference",
    body: "Run sensitive analyses (portfolio, tax, private wallet lookups) entirely on your Mac or iPhone — zero data leaves the device.",
  },
  {
    quarter: "Q1 2027",
    status: "planned",
    title: "Community model fine-tuning",
    body: "Bring-your-own-strategy tuning — users contribute anonymized signals in exchange for model credits and premium access.",
  },
];

const statusBadge = (status: Milestone["status"]) => {
  const map = {
    shipped: { label: "SHIPPED", accent: theme.emerald },
    "in-progress": { label: "IN PROGRESS", accent: theme.amber },
    planned: { label: "PLANNED", accent: theme.textDim },
  } as const;
  const { label, accent } = map[status];
  return el.text(label, {
    fontSize: 10,
    fontWeight: "800",
    color: accent,
    letterSpacing: "0.18em",
    marginBottom: 0,
  });
};

const milestoneRow = (m: Milestone) =>
  row(
    [
      col(15, [
        el.heading(m.quarter, {
          level: "h4",
          fontSize: 15,
          fontWeight: "800",
          color: theme.primary,
          marginBottom: 6,
          letterSpacing: "0.02em",
        }),
        statusBadge(m.status),
      ]),
      col(
        5,
        [
          col(
            100,
            [el.text("", { marginBottom: 0 })],
            {
              backgroundColor:
                m.status === "shipped"
                  ? theme.emerald
                  : m.status === "in-progress"
                  ? theme.amber
                  : theme.border,
              borderRadius: 999,
              width: "12px",
              maxWidth: "12px",
              height: "12px",
              marginTop: 4,
            }
          ) as any,
        ],
        { textAlign: "center" }
      ),
      col(80, [
        el.heading(m.title, {
          level: "h3",
          fontSize: 22,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 10,
          letterSpacing: "-0.01em",
        }),
        el.text(m.body, {
          fontSize: 15,
          color: theme.textMuted,
          lineHeight: "1.65",
          marginBottom: 0,
        }),
      ]),
    ],
    {
      ...rowPresets.narrow,
      maxWidth: "960px",
      gutter: 24,
      paddingTop: 28,
      paddingBottom: 28,
      borderBottom: true,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      verticalAlign: "top",
    }
  );

export const aiFeaturesAiLearningRoadmap: Section = section(
  [
    singleColumnRow([
      el.text("PUBLIC ROADMAP", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.violet,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("What's shipping next in Mash AI", {
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
        "We ship quarterly. Here's everything planned for the next 18 months, with status updated weekly.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    ...milestones.map(milestoneRow),
    singleColumnRow(
      [
        el.button("Request a feature", "/ai/feedback", {
          backgroundColor: theme.cssViolet,
          color: theme.onBand,
          marginTop: 24,
          marginRight: 12,
        }),
        el.button("Subscribe to updates", "/ai/updates", {
          backgroundColor: theme.cssSurface3,
          color: theme.cssForeground,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.border,
          marginTop: 24,
          marginRight: 0,
        }),
      ],
      { textAlign: "center", maxWidth: "960px" }
    ),
  ],
  {
    name: "AI Learning Roadmap",
    description: "Vertical timeline of upcoming Mash AI milestones with status badges",
    category: "ai-features",
    slug: "ai-features-ai-learning-roadmap",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
