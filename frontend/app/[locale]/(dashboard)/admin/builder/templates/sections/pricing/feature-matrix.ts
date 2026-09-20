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

function headerCell(label: string, accent = false) {
  return el.text(label, {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    color: accent ? theme.primary : theme.text,
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 12,
    paddingRight: 12,
    marginBottom: 0,
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
    borderColor: accent ? theme.primary : theme.border,
  });
}

function cell(value: string, accent = false) {
  return el.text(value, {
    fontSize: 14,
    textAlign: "center",
    color: accent ? theme.text : theme.textMuted,
    fontWeight: accent ? "600" : "400",
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 12,
    paddingRight: 12,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: theme.border,
    backgroundColor: accent
      ? "rgba(31,113,235,0.08)"
      : undefined,
  });
}

function labelCell(value: string) {
  return el.text(value, {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 16,
    paddingRight: 12,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: theme.border,
  });
}

export const pricingFeatureMatrix: Section = section(
  [
    singleColumnRow([
      el.text("WHY US", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 16,
      }),
      el.heading("How we compare", {
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: "-0.03em",
        marginBottom: 16,
      }),
      el.text("Honest, line-by-line differences against the most common alternatives.", {
        fontSize: 18,
        textAlign: "center",
        marginBottom: 48,
      }),
    ]),
    row(
      [
        col(40, [
          el.text(" ", {
            fontSize: 14,
            paddingTop: 16,
            paddingBottom: 16,
            marginBottom: 0,
            borderBottomWidth: 2,
            borderBottomStyle: "solid",
            borderColor: theme.border,
          }),
          labelCell("Supported venues"),
          labelCell("Direct order routing"),
          labelCell("Strategy backtesting"),
          labelCell("API rate limits"),
          labelCell("Admin audit trail"),
          labelCell("24/7 phone support"),
          labelCell("Monthly price"),
        ]),
        col(20, [
          headerCell("Lumen", true),
          cell("28 exchanges", true),
          cell("Included", true),
          cell("Unlimited", true),
          cell("5,000/sec", true),
          cell("Yes", true),
          cell("Yes", true),
          cell("$49", true),
        ]),
        col(20, [
          headerCell("Competitor A"),
          cell("12 exchanges"),
          cell("Add-on"),
          cell("1-year history"),
          cell("500/sec"),
          cell("No"),
          cell("Business hours"),
          cell("$79"),
        ]),
        col(20, [
          headerCell("Competitor B"),
          cell("18 exchanges"),
          cell("Not offered"),
          cell("3-month history"),
          cell("1,000/sec"),
          cell("Yes"),
          cell("No"),
          cell("$129"),
        ]),
      ],
      { ...rowPresets.contained, gutter: 0 }
    ),
    singleColumnRow(
      [
        el.button("Start your free trial", "/signup", {
          fontSize: 15,
          paddingLeft: 32,
          paddingRight: 32,
          marginTop: 40,
          marginRight: 0,
        }),
      ],
      { textAlign: "center" }
    ),
  ],
  {
    name: "Feature Matrix",
    description: "Side-by-side comparison table (us vs two competitors) across feature rows",
    category: "pricing",
    slug: "pricing-feature-matrix",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
