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

const step = (n: string, title: string, body: string) =>
  row(
    [
      col(12, [
        el.text(n, {
          fontSize: 20,
          fontWeight: "800",
          color: theme.primaryText,
          backgroundColor: theme.primary,
          borderRadius: 999,
          width: "56px",
          height: "56px",
          textAlign: "center",
          lineHeight: "56px",
          marginBottom: 0,
        }),
      ]),
      col(88, [
        el.heading(title, {
          level: "h3",
          fontSize: 26,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 10,
          letterSpacing: "-0.015em",
        }),
        el.text(body, {
          fontSize: 17,
          color: theme.textMuted,
          lineHeight: "1.7",
          marginBottom: 0,
          maxWidth: "620px",
        }),
      ]),
    ],
    { ...rowPresets.narrow, gutter: 24, marginBottom: 48, verticalAlign: "top" }
  );

export const featuresTimelineVertical: Section = section(
  [
    singleColumnRow([
      el.text("HOW IT WORKS", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.2em",
        marginBottom: 16,
        textAlign: "center",
      }),
      el.heading("From zero to production in four steps", {
        level: "h2",
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.03em",
        lineHeight: "1.1",
      }),
      el.text(
        "Our onboarding is deliberately short. Most teams ship their first workflow in under an hour.",
        {
          fontSize: 19,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 72,
          lineHeight: "1.6",
        }
      ),
    ]),
    step(
      "1",
      "Connect your stack",
      "Install the CLI, run one init command, and we'll detect your framework, package manager, and deploy targets automatically."
    ),
    step(
      "2",
      "Define your workflows",
      "Write tasks in plain TypeScript or Python. No DSL, no YAML — use the language and libraries you already know."
    ),
    step(
      "3",
      "Deploy to the edge",
      "A single command ships everything to 300+ PoPs with zero-downtime rollouts and automatic rollback on health-check failure."
    ),
    step(
      "4",
      "Observe and iterate",
      "Live traces, logs, and metrics correlate to the exact commit and workflow run — no context switching required."
    ),
  ],
  {
    name: "Vertical Timeline Features",
    description: "Numbered vertical timeline walking through a four-step flow",
    category: "features",
    slug: "features-timeline-vertical",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
