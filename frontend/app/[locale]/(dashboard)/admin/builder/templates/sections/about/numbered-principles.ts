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

const principle = (num: string, title: string, body: string) =>
  el.card(
    {
      padding: 32,
      borderRadius: 18,
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      height: "100%",
    },
    [
      el.heading(num, {
        fontSize: 56,
        fontWeight: "800",
        letterSpacing: "-0.04em",
        color: theme.primary,
        marginBottom: 16,
        lineHeight: "1",
      }),
      el.heading(title, {
        fontSize: 20,
        fontWeight: "700",
        letterSpacing: "-0.01em",
        marginBottom: 10,
        color: theme.text,
      }),
      el.text(body, {
        fontSize: 15,
        lineHeight: "1.65",
        color: theme.textMuted,
        marginBottom: 0,
      }),
    ]
  );

export const aboutNumberedPrinciples: Section = section(
  [
    singleColumnRow([
      el.text("HOW WE OPERATE", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("Five principles we protect", {
        textAlign: "center",
        fontSize: 44,
        letterSpacing: "-0.02em",
        marginBottom: 16,
      }),
      el.text(
        "We rewrite almost anything except these. They are the spine.",
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
        col(20, [
          principle(
            "01",
            "Latency is a feature",
            "If a change adds latency to the hot path, it ships behind a flag or it does not ship at all."
          ),
        ]),
        col(20, [
          principle(
            "02",
            "Show the real number",
            "No adjusted uptime, no selective benchmarks. We publish what actually happened, every month."
          ),
        ]),
        col(20, [
          principle(
            "03",
            "Small teams, deep ownership",
            "Every surface is owned end-to-end by a team of five or fewer. Reviews, pages, and wins included."
          ),
        ]),
        col(20, [
          principle(
            "04",
            "Read the order book",
            "Every engineer spends a day a quarter watching real order flow. Empathy is a design constraint."
          ),
        ]),
        col(20, [
          principle(
            "05",
            "Boring where it matters",
            "We pick boring databases, boring languages, boring deployment strategies. Then we get exciting inside."
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 20 }
    ),
  ],
  {
    name: "Numbered Principles",
    description: "Five numbered principles in a grid",
    category: "about",
    slug: "about-numbered-principles",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
