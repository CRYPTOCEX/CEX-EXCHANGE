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

export const newsletterInlineFooterStyle: Section = section(
  [
    row(
      [
        col(50, [
          el.text("Stay in the loop — one email a week.", {
            fontSize: 16,
            fontWeight: "500",
            color: theme.text,
            marginBottom: 0,
            lineHeight: "1.5",
          }),
        ]),
        {
          ...col(50, []),
          rows: [
            row(
              [
                col(70, [
                  el.text("you@company.com", {
                    fontSize: 14,
                    color: theme.textDim,
                    backgroundColor: theme.bgCard,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: theme.border,
                    borderRadius: 8,
                    paddingTop: 11,
                    paddingBottom: 11,
                    paddingLeft: 14,
                    paddingRight: 14,
                    marginBottom: 0,
                  }),
                ]),
                col(30, [
                  el.button("Subscribe", "#", {
                    width: "100%",
                    marginTop: 0,
                    marginRight: 0,
                    paddingTop: 11,
                    paddingBottom: 11,
                    paddingLeft: 16,
                    paddingRight: 16,
                    fontSize: 14,
                    textAlign: "center",
                  }),
                ]),
              ],
              { gutter: 8, maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
            ),
          ],
        },
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Inline Footer Style",
    description: "Minimal one-liner and inline signup — fits anywhere without drawing focus",
    category: "newsletter",
    slug: "newsletter-inline-footer-style",
    settings: {
      ...sectionPresets.compact,
      paddingTop: 36,
      paddingBottom: 36,
      backgroundColor: theme.bgSubtle,
      borderTop: true,
      borderBottom: true,
      borderColor: theme.border,
      borderWidth: 1,
      borderStyle: "solid",
    },
  }
);
