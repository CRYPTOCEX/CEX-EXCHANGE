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
import type { Element } from "@/types/builder";

const statRow = (value: string, label: string, last = false): Element[] => [
  el.heading(value, {
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: "-0.02em",
    color: theme.text,
    marginBottom: 4,
    level: "h3",
  }),
  el.text(label, {
    fontSize: 15,
    color: theme.textMuted,
    marginBottom: last ? 0 : 0,
  }),
  ...(last ? [] : [el.divider({ marginTop: 24, marginBottom: 24, borderColor: theme.border })]),
];

export const statsVerticalSplit: Section = section(
  [
    row(
      [
        col(50, [
          el.text("WHY TRADERS CHOOSE US", {
            fontSize: 13,
            fontWeight: "700",
            color: theme.primary,
            letterSpacing: "0.14em",
            marginBottom: 16,
          }),
          el.heading("Built on the numbers that actually move your P&L", {
            fontSize: 44,
            color: theme.text,
            marginBottom: 20,
            letterSpacing: "-0.02em",
          }),
          el.text(
            "We're obsessed with execution quality, uptime, and transparency. The metrics on the right are updated live from production.",
            {
              fontSize: 18,
              color: theme.textMuted,
              marginBottom: 32,
              lineHeight: "1.65",
              maxWidth: "460px",
            }
          ),
          el.button("See full stack", "/platform", {
            fontSize: 16,
          }),
        ]),
        col(50, [
          el.card({ padding: 40, borderRadius: 20 }, [
            ...statRow("$2.4B", "Average daily notional volume"),
            ...statRow("240K", "Verified active traders this month"),
            ...statRow("150+", "Tradable pairs across asset classes"),
            ...statRow("24/7", "Markets open, every day of the year", true),
          ]),
        ]),
      ],
      { ...rowPresets.wide, gutter: 48, verticalAlign: "top" }
    ),
  ],
  {
    name: "Vertical Split",
    description: "Heading and text on the left, four stacked stats on the right",
    category: "stats",
    slug: "stats-vertical-split",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
