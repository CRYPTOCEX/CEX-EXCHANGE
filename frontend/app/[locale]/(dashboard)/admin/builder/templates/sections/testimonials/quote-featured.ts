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

export const testimonialsQuoteFeatured: Section = section(
  [
    row(
      [
        col(100, [
          el.heading("“", {
            textAlign: "center",
            fontSize: 160,
            lineHeight: "1",
            fontWeight: "800",
            color: theme.primary,
            marginBottom: 0,
            level: "h3",
          }),
          el.heading(
            "This platform is the single biggest upgrade our desk has made in five years. Execution, analytics, and risk in one tool, and it feels purpose-built for how we actually trade.",
            {
              textAlign: "center",
              fontSize: 40,
              fontWeight: "600",
              lineHeight: "1.35",
              letterSpacing: "-0.01em",
              color: theme.text,
              marginBottom: 48,
              maxWidth: "960px",
              level: "h2",
            }
          ),
          el.image(
            "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&q=80",
            "Portrait of Elena Marquez",
            {
              width: "72px",
              height: "72px",
              borderRadius: 999,
              marginBottom: 20,
            }
          ),
          el.text("Elena Marquez", {
            textAlign: "center",
            fontSize: 18,
            fontWeight: "600",
            color: theme.text,
            marginBottom: 4,
          }),
          el.text("Managing Partner, Lumen Trading Partners", {
            textAlign: "center",
            fontSize: 15,
            color: theme.textMuted,
            marginBottom: 0,
          }),
        ], { textAlign: "center" }),
      ],
      { ...rowPresets.narrow }
    ),
  ],
  {
    name: "Featured Quote",
    description: "Single massive centered quote with giant quotation mark",
    category: "testimonials",
    slug: "testimonials-quote-featured",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
