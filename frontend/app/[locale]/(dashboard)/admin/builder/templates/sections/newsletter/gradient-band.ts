import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  gradients,
  sectionPresets,
  rowPresets,
} from "../../utils";

export const newsletterGradientBand: Section = section(
  [
    row(
      [
        col(55, [
          el.text("THE EDGE", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.onBandMuted,
            letterSpacing: "0.22em",
            marginBottom: 14,
          }),
          el.heading("Get ahead of the market", {
            level: "h2",
            fontSize: 38,
            fontWeight: "800",
            color: theme.onBand,
            marginBottom: 10,
            letterSpacing: "-0.02em",
            lineHeight: "1.15",
          }),
          el.text(
            "Weekly insights delivered straight to your inbox. Trusted by 38,000+ professionals.",
            {
              fontSize: 16,
              lineHeight: "1.6",
              color: theme.onBandMuted,
              marginBottom: 0,
            }
          ),
        ]),
        {
          ...col(45, []),
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
                    borderColor: theme.onBandBorder,
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
                    backgroundColor: theme.onBandSurface,
                    color: theme.onBandSurfaceInk,
                    width: "100%",
                    marginTop: 0,
                    marginRight: 0,
                    textAlign: "center",
                  }),
                ]),
              ],
              { gutter: 10, maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
            ),
          ],
        },
      ],
      { ...rowPresets.wide, gutter: 40, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Gradient Band Newsletter",
    description: "Full-width gradient band with inline signup and punchy copy",
    category: "newsletter",
    slug: "newsletter-gradient-band",
    type: "fullwidth",
    settings: {
      ...sectionPresets.compact,
      backgroundColor: gradients.indigoViolet,
    },
  }
);
