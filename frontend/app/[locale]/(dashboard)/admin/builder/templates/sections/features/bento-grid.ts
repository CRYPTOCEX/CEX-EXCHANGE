import type { Section, Column, Row } from "@/types/builder";
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

const tileBase = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.border,
  borderRadius: 18,
  padding: 32,
  backgroundColor: theme.bgCard,
};

const largeTile = (
  icon: string,
  title: string,
  description: string,
  accent: string,
  extra?: Record<string, unknown>
) =>
  col(100, [
    el.icon(icon, { size: 36, color: accent, marginBottom: 24 }),
    el.heading(title, {
      level: "h3",
      fontSize: 28,
      fontWeight: "800",
      color: theme.text,
      marginBottom: 12,
      letterSpacing: "-0.02em",
    }),
    el.text(description, {
      fontSize: 16,
      color: theme.textMuted,
      lineHeight: "1.65",
      marginBottom: 0,
      maxWidth: "440px",
    }),
  ], { ...tileBase, ...(extra || {}) });

const smallTile = (
  icon: string,
  title: string,
  description: string,
  accent: string
) =>
  col(100, [
    el.icon(icon, { size: 28, color: accent, marginBottom: 16 }),
    el.heading(title, {
      level: "h3",
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 8,
    }),
    el.text(description, {
      fontSize: 14,
      color: theme.textMuted,
      lineHeight: "1.6",
      marginBottom: 0,
    }),
  ], { ...tileBase, padding: 24 });

// Nested rows: each "card" wraps a nested row inside a column so that
// the bento layout can position small tiles beside large ones.
const nestedRow = (columns: Column[], gutter = 20): Row =>
  row(columns, { gutter, maxWidth: "100%" });

export const featuresBentoGrid: Section = section(
  [
    singleColumnRow([
      el.text("THE PLATFORM", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.2em",
        marginBottom: 16,
        textAlign: "center",
      }),
      el.heading("A canvas that grows with your team", {
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
        "Six connected surfaces, one mental model. Everything where you expect it.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "600px",
          marginBottom: 72,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        // LEFT column: one large tile + a row of two small tiles
        {
          ...col(66, []),
          rows: [
            nestedRow([
              largeTile(
                "lucide:sparkles",
                "AI copilot, built in",
                "Ask questions, explore data, and generate reports in plain English. Your copilot learns your schema in minutes.",
                theme.primary,
                {
                  backgroundColor: gradients.indigoViolet,
                  borderColor: theme.onBandBorder,
                  padding: 40,
                }
              ),
            ]),
            nestedRow([
              smallTile("lucide:timer", "Instant previews", "See changes render before you finish typing.", theme.sky),
              smallTile("lucide:history", "Version history", "Roll back any block to any prior state.", theme.emerald),
            ]),
          ],
        },
        // RIGHT column: two stacked small tiles + one large tile
        {
          ...col(34, []),
          rows: [
            nestedRow([
              smallTile(
                "lucide:globe-2",
                "Global edge",
                "Served from 300+ PoPs so your users never wait.",
                theme.amber
              ),
            ]),
            nestedRow([
              smallTile(
                "lucide:shield-check",
                "Audit trails",
                "Every privileged action recorded, encrypted, and reviewable.",
                theme.emerald
              ),
            ]),
            nestedRow([
              largeTile(
                "lucide:bar-chart-3",
                "Analytics",
                "Funnels, cohorts, and revenue views with zero setup.",
                theme.violet
              ),
            ]),
          ],
        },
      ],
      { ...rowPresets.wide, gutter: 20, verticalAlign: "top" }
    ),
  ],
  {
    name: "Bento Grid Features",
    description: "Asymmetric bento layout mixing large and small feature tiles",
    category: "features",
    slug: "features-bento-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
