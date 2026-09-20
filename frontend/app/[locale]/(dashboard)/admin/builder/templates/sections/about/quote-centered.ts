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

export const aboutQuoteCentered: Section = section(
  [
    row(
      [
        col(12, []),
        col(76, [
          el.icon("quote", {
            size: 64,
            color: theme.primary,
            marginBottom: 32,
            opacity: 0.35,
          }),
          el.heading(
            "We did not set out to build an exchange. We set out to build the one we wished had existed the morning we quit our jobs.",
            {
              fontSize: 56,
              fontWeight: "600",
              letterSpacing: "-0.03em",
              lineHeight: "1.2",
              textAlign: "center",
              color: theme.text,
              marginBottom: 48,
              maxWidth: "100%",
            }
          ),
          el.image(
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&q=80",
            "Portrait of Maya Chen",
            {
              width: "72px",
              height: "72px",
              borderRadius: 999,
              marginBottom: 20,
              marginLeft: "auto",
              marginRight: "auto",
              display: "block",
            }
          ),
          el.text("Maya Chen", {
            fontSize: 18,
            fontWeight: "700",
            textAlign: "center",
            color: theme.text,
            marginBottom: 4,
          }),
          el.text("Co-founder & CEO", {
            fontSize: 15,
            textAlign: "center",
            color: theme.textMuted,
            marginBottom: 0,
          }),
        ]),
        col(12, []),
      ],
      { ...rowPresets.contained, gutter: 0 }
    ),
  ],
  {
    name: "Centered Founder Quote",
    description: "Massive founder quote with attribution",
    category: "about",
    slug: "about-quote-centered",
    settings: {
      ...sectionPresets.standard,
      paddingTop: 120,
      paddingBottom: 120,
      backgroundColor: theme.bgSubtle,
    },
  }
);
