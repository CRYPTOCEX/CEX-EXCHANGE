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

export const ctaNewsletterInline: Section = section(
  [
    singleColumnRow(
      [
        el.card(
          {
            backgroundColor: theme.bandInk,
            borderColor: "#12181f",
            borderWidth: 1,
            borderRadius: 24,
            padding: 56,
            maxWidth: "920px",
            marginLeft: "auto",
            marginRight: "auto",
            textAlign: "center",
          },
          [
            el.text("THE WEEKLY EDGE", {
              fontSize: 12,
              fontWeight: "700",
              textAlign: "center",
              color: theme.primary,
              letterSpacing: "0.12em",
              marginBottom: 16,
            }),
            el.heading("Market insights, in your inbox every Monday", {
              fontSize: 40,
              fontWeight: "800",
              textAlign: "center",
              color: theme.onBand,
              letterSpacing: "-0.02em",
              marginBottom: 14,
            }),
            el.text(
              "A 5-minute brief on macro, on-chain flows, and the week ahead. Read by 38,000+ professionals.",
              {
                fontSize: 17,
                textAlign: "center",
                color: theme.onBandDim,
                marginBottom: 32,
                maxWidth: "560px",
                marginLeft: "auto",
                marginRight: "auto",
              }
            ),
          ]
        ),
        row(
          [
            col(70, [
              el.text("you@company.com", {
                fontSize: 16,
                color: theme.onBandDim,
                backgroundColor: theme.onBandFill,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: theme.onBandFill,
                borderRadius: 10,
                paddingTop: 14,
                paddingBottom: 14,
                paddingLeft: 18,
                paddingRight: 18,
                marginBottom: 0,
              }),
            ]),
            col(30, [
              el.button("Subscribe", "#", {
                width: "100%",
                fontSize: 15,
                marginTop: 0,
                marginRight: 0,
              }),
            ]),
          ],
          { ...rowPresets.narrow, gutter: 12, maxWidth: "560px" }
        ),
      ],
      { textAlign: "center" }
    ),
  ],
  {
    name: "Newsletter Inline CTA",
    description: "Dark card with inline email input and subscribe button",
    category: "cta",
    slug: "cta-newsletter-inline",
    settings: {
      ...sectionPresets.compact,
      backgroundColor: theme.bgBase,
    },
  }
);
