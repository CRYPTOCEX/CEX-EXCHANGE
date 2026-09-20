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

const milestone = (year: string, title: string, body: string) =>
  el.card(
    {
      padding: 28,
      borderRadius: 16,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      marginBottom: 20,
    },
    [
      el.text(year, {
        fontSize: 14,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.12em",
        marginBottom: 8,
      }),
      el.heading(title, {
        fontSize: 22,
        fontWeight: "700",
        letterSpacing: "-0.01em",
        marginBottom: 8,
        color: theme.text,
      }),
      el.text(body, {
        fontSize: 16,
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ]
  );

export const aboutTimelineMilestones: Section = section(
  [
    singleColumnRow([
      el.text("OUR JOURNEY", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Seven years in seven moments", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 16,
      }),
      el.text(
        "The milestones that shaped who we are and what we build next.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(20, []),
        col(60, [
          milestone(
            "2018",
            "Three engineers, one thesis",
            "Founded in Singapore with a seed round led by angel traders from Hong Kong and London. First matching engine shipped in 11 weeks."
          ),
          milestone(
            "2019",
            "First institutional desk goes live",
            "Meridian Capital migrates their Asia book and opens the door for twelve regional desks over the next six months."
          ),
          milestone(
            "2020",
            "Crossed one billion in daily volume",
            "Our derivatives stack crosses the nine-zero mark while the rest of the world is working from home."
          ),
          milestone(
            "2022",
            "Series B and a new home in Zurich",
            "Raised $82M led by Sequoia Growth and opened our European engineering office on Talstrasse."
          ),
          milestone(
            "2023",
            "Open sourced our risk engine",
            "Shipped our internal pre-trade risk stack under Apache 2.0. Forty-two contributors in the first quarter."
          ),
          milestone(
            "2024",
            "180,000 traders across 42 countries",
            "Now clearing record monthly volume on a matching engine we run ourselves."
          ),
          milestone(
            "2025",
            "Multi-asset, multi-region, multi-cloud",
            "Unified spot, futures, and options under a single margin model. Active-active across three regions."
          ),
        ]),
        col(20, []),
      ],
      { ...rowPresets.contained, gutter: 0 }
    ),
  ],
  {
    name: "Timeline Milestones",
    description: "Vertical timeline of company milestones",
    category: "about",
    slug: "about-timeline-milestones",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
