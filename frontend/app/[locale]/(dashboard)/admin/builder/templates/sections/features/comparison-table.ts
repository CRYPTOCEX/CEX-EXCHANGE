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

const checkRow = (label: string, us: boolean, them: boolean) =>
  row(
    [
      col(50, [
        el.text(label, {
          fontSize: 16,
          color: theme.text,
          fontWeight: "500",
          marginBottom: 0,
        }),
      ]),
      col(25, [
        el.icon(us ? "lucide:check-circle-2" : "lucide:x-circle", {
          size: 22,
          color: us ? theme.emerald : theme.textDim,
          marginBottom: 0,
        }),
      ], { textAlign: "center" }),
      col(25, [
        el.icon(them ? "lucide:check-circle-2" : "lucide:x-circle", {
          size: 22,
          color: them ? theme.emerald : theme.rose,
          marginBottom: 0,
        }),
      ], { textAlign: "center" }),
    ],
    {
      ...rowPresets.narrow,
      gutter: 16,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottom: true,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      verticalAlign: "middle",
    }
  );

export const featuresComparisonTable: Section = section(
  [
    singleColumnRow([
      el.heading("See how we compare", {
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
        "An honest, feature-by-feature breakdown against what most teams use today.",
        {
          fontSize: 19,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "600px",
          marginBottom: 64,
          lineHeight: "1.6",
        }
      ),
    ]),
    // Header row
    row(
      [
        col(50, [
          el.text("Feature", {
            fontSize: 13,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 0,
          }),
        ]),
        col(25, [
          el.heading("Apex", {
            level: "h3",
            fontSize: 18,
            fontWeight: "800",
            color: theme.primary,
            marginBottom: 0,
            textAlign: "center",
          }),
        ]),
        col(25, [
          el.heading("Legacy", {
            level: "h3",
            fontSize: 18,
            fontWeight: "700",
            color: theme.textMuted,
            marginBottom: 0,
            textAlign: "center",
          }),
        ]),
      ],
      {
        ...rowPresets.narrow,
        gutter: 16,
        paddingTop: 20,
        paddingBottom: 20,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: theme.border,
        backgroundColor: theme.bgMuted,
        borderRadius: 12,
        verticalAlign: "middle",
      }
    ),
    checkRow("Sub-second cold starts", true, false),
    checkRow("Global edge by default", true, false),
    checkRow("Built-in observability", true, true),
    checkRow("Full admin audit trail", true, true),
    checkRow("Real-time collaboration", true, false),
    checkRow("Durable workflow engine", true, false),
    checkRow("Transparent usage-based pricing", true, false),
  ],
  {
    name: "Comparison Table Features",
    description: "Two-column comparison highlighting us vs. the legacy alternative",
    category: "features",
    slug: "features-comparison-table",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
