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

export const contactInlineMinimal: Section = section(
  [
    row(
      [
        col(15, []),
        col(70, [
          el.text("CONTACT", {
            fontSize: 13,
            fontWeight: "700",
            textAlign: "center",
            color: theme.primary,
            letterSpacing: "0.18em",
            marginBottom: 20,
          }),
          el.heading("One inbox. Real humans on the other side.", {
            textAlign: "center",
            fontSize: 56,
            fontWeight: "800",
            letterSpacing: "-0.03em",
            lineHeight: "1.1",
            marginBottom: 24,
            color: theme.text,
          }),
          el.text(
            "Most emails get a reply in under an hour. Never longer than a business day.",
            {
              textAlign: "center",
              fontSize: 20,
              color: theme.textMuted,
              marginBottom: 40,
              maxWidth: "640px",
            }
          ),
          el.button("hello@company.com", "mailto:hello@company.com", {
            fontSize: 18,
            paddingTop: 18,
            paddingBottom: 18,
            paddingLeft: 36,
            paddingRight: 36,
            borderRadius: 999,
          }),
        ]),
        col(15, []),
      ],
      { ...rowPresets.contained, gutter: 0 }
    ),
  ],
  {
    name: "Inline Minimal",
    description: "Minimal centered headline and single email CTA",
    category: "contact",
    slug: "contact-inline-minimal",
    settings: {
      ...sectionPresets.standard,
      paddingTop: 140,
      paddingBottom: 140,
      backgroundColor: theme.bgBase,
    },
  }
);
