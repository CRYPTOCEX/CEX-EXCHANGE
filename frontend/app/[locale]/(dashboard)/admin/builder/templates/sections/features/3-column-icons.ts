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

const featureColumn = (
  icon: string,
  title: string,
  description: string,
  accent: string = theme.primary
) => [
  el.icon(icon, {
    size: 44,
    color: accent,
    backgroundColor: theme.primarySoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
  }),
  el.heading(title, {
    level: "h3",
    fontSize: 22,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 12,
    letterSpacing: "-0.01em",
  }),
  el.text(description, {
    fontSize: 16,
    lineHeight: "1.7",
    color: theme.textMuted,
    marginBottom: 0,
  }),
];

export const features3ColumnIcons: Section = section(
  [
    singleColumnRow([
      el.text("CAPABILITIES", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.2em",
        marginBottom: 16,
        textAlign: "center",
      }),
      el.heading("Everything you need to move markets", {
        level: "h2",
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 20,
        letterSpacing: "-0.03em",
        lineHeight: "1.1",
        maxWidth: "760px",
      }),
      el.text(
        "A complete toolkit for traders, analysts, and quants — engineered for speed, clarity, and control.",
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
    row(
      [
        col(33.33, featureColumn(
          "lucide:zap",
          "Your own matching engine",
          // WAS: "Orders reach exchanges in under 1ms with co-located servers
          // across NY, LDN, and Tokyo." Three claims, none of them true: there
          // is no colocation, no NY/LDN/Tokyo presence, and no sub-millisecond
          // figure anyone has measured — and "reach exchanges" describes the
          // provider path, which is the opposite of the in-house engine this
          // column is selling. An operator can drag this section onto a public
          // page from the Insert Section modal, so it is a claim their visitors
          // read. The heading is kept because it IS true: the engine is real.
          "Match orders on your own in-house order book, with no third-party venue between you and your customers.",
          theme.primary
        )),
        col(33.33, featureColumn(
          "lucide:shield-check",
          "Institutional security",
          "Hardware-backed keys and on-chain audit trails for every action.",
          theme.emerald
        )),
        col(33.33, featureColumn(
          "lucide:bar-chart-3",
          "Backtest on real data",
          "Replay ten years of tick data against your strategy — or stream it live without rewriting.",
          theme.violet
        )),
      ],
      { ...rowPresets.wide, gutter: 40 }
    ),
  ],
  {
    name: "3-Column Icon Features",
    description: "Three equal columns with icon, title, and short benefit copy",
    category: "features",
    slug: "features-3-column-icons",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
