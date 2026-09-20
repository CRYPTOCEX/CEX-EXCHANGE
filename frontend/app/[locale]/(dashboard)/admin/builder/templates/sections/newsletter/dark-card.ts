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

export const newsletterDarkCard: Section = section(
  [
    row(
      [
        {
          ...col(100, [
            el.icon("lucide:mail", {
              size: 36,
              color: theme.onBand,
              backgroundColor: theme.onBandFill,
              borderRadius: 14,
              padding: 14,
              marginBottom: 24,
              marginLeft: "auto",
              marginRight: "auto",
            }),
            el.heading("The signal. Not the noise.", {
              fontSize: 40,
              fontWeight: "800",
              textAlign: "center",
              color: theme.onBand,
              letterSpacing: "-0.02em",
              marginBottom: 14,
            }),
            el.text(
              "Weekly analysis on macro, markets, and technology — curated by analysts, written for operators.",
              {
                fontSize: 17,
                textAlign: "center",
                color: theme.onBandDim,
                marginBottom: 32,
                maxWidth: "520px",
                marginLeft: "auto",
                marginRight: "auto",
              }
            ),
          ], { textAlign: "center", paddingTop: 0, paddingBottom: 0 }),
          rows: [
            row(
              [
                col(65, [
                  el.text("you@company.com", {
                    fontSize: 15,
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
                col(35, [
                  el.button("Subscribe", "#", {
                    width: "100%",
                    marginTop: 0,
                    marginRight: 0,
                    textAlign: "center",
                  }),
                ]),
              ],
              { gutter: 10, maxWidth: "540px", marginLeft: "auto", marginRight: "auto", paddingLeft: 0, paddingRight: 0 }
            ),
          ],
        },
      ],
      {
        ...rowPresets.contained,
        maxWidth: "920px",
        backgroundColor: theme.bandInk,
        borderColor: "#12181f",
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: 24,
        paddingTop: 64,
        paddingBottom: 64,
        paddingLeft: 48,
        paddingRight: 48,
      }
    ),
  ],
  {
    name: "Dark Card Newsletter",
    description: "Contained dark card on a light section with an inline signup form",
    category: "newsletter",
    slug: "newsletter-dark-card",
    settings: {
      ...sectionPresets.compact,
      backgroundColor: theme.bgSubtle,
    },
  }
);
