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

export const statsMinimalCentered: Section = section(
  [
    row(
      [
        col(100, [
          el.text("MARKETS OPEN", {
            fontSize: 13,
            fontWeight: "700",
            textAlign: "center",
            color: theme.primary,
            letterSpacing: "0.18em",
            marginBottom: 40,
          }),
          el.heading("24/7", {
            textAlign: "center",
            fontSize: 220,
            fontWeight: "800",
            lineHeight: "1",
            letterSpacing: "-0.05em",
            color: theme.text,
            marginBottom: 32,
            level: "h3",
          }),
          el.text(
            "Crypto does not keep office hours, and neither do we.",
            {
              textAlign: "center",
              fontSize: 20,
              color: theme.textMuted,
              maxWidth: "560px",
              marginBottom: 0,
              lineHeight: "1.55",
            }
          ),
        ], { textAlign: "center" }),
      ],
      { ...rowPresets.narrow }
    ),
  ],
  {
    name: "Minimal Centered",
    description: "One huge centered number with a short supporting label",
    category: "stats",
    slug: "stats-minimal-centered",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
