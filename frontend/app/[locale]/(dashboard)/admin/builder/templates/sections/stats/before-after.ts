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
import type { Element, ColorValue } from "@/types/builder";

const stateCard = (
  tag: string,
  tagBg: ColorValue,
  tagColor: ColorValue,
  headline: string,
  items: string[],
  metric: string,
  metricLabel: string,
  border: ColorValue,
): Element =>
  el.card(
    {
      padding: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: border,
    },
    [
      el.text(tag, {
        fontSize: 12,
        fontWeight: "700",
        color: tagColor,
        backgroundColor: tagBg,
        letterSpacing: "0.14em",
        borderRadius: 999,
        paddingTop: 6,
        paddingBottom: 6,
        paddingLeft: 14,
        paddingRight: 14,
        marginBottom: 20,
        maxWidth: "100px",
        textAlign: "center",
      }),
      el.heading(headline, {
        fontSize: 28,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 24,
        letterSpacing: "-0.01em",
        level: "h3",
      }),
      el.list(items, {
        fontSize: 15,
        color: theme.textMuted,
        lineHeight: "1.8",
        marginBottom: 32,
      }),
      el.divider({ marginTop: 0, marginBottom: 24, borderColor: theme.border }),
      el.heading(metric, {
        fontSize: 56,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        color: theme.text,
        marginBottom: 4,
        level: "h3",
      }),
      el.text(metricLabel, {
        fontSize: 13,
        fontWeight: "600",
        color: theme.textMuted,
        letterSpacing: "0.08em",
        marginBottom: 0,
      }),
    ]
  );

export const statsBeforeAfter: Section = section(
  [
    singleColumnRow([
      el.text("THE IMPACT", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("What changes on day one", {
        textAlign: "center",
        fontSize: 44,
        color: theme.text,
        marginBottom: 16,
      }),
      el.text(
        "Average results from the first 30 days across 180 teams who migrated to our platform.",
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
        col(50, [
          stateCard(
            "BEFORE",
            "[hsl(var(--destructive)/0.16)]",
            theme.rose,
            "Fragmented, slow, expensive",
            [
              "Three vendors for execution, charts, and analytics",
              "4–7 basis points of average slippage per trade",
              "Manual P&L reconciliation every evening",
              "Weekly data-feed outages",
            ],
            "14 min",
            "AVG TIME TO FLATTEN A BOOK",
            theme.border,
          ),
        ]),
        col(50, [
          stateCard(
            "AFTER",
            "[hsl(var(--success)/0.16)]",
            theme.emerald,
            "Unified, fast, measurable",
            [
              "Single platform for execution, charts, and analytics",
              "1–2 basis points of average slippage per trade",
              "Real-time P&L across every venue",
              "One reconciled view of data and execution",
            ],
            "22 sec",
            "AVG TIME TO FLATTEN A BOOK",
            theme.emerald,
          ),
        ]),
      ],
      { ...rowPresets.contained, gutter: 32, verticalAlign: "top" }
    ),
  ],
  {
    name: "Before / After",
    description: "Two-column comparison of a Before state vs an After with contrasting visuals",
    category: "stats",
    slug: "stats-before-after",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
