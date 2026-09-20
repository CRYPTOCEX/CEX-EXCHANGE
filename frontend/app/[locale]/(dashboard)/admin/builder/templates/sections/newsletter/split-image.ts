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

export const newsletterSplitImage: Section = section(
  [
    row(
      [
        {
          ...col(50, [
            el.text("WEEKLY BRIEF", {
              fontSize: 12,
              fontWeight: "700",
              color: theme.primary,
              letterSpacing: "0.22em",
              marginBottom: 16,
            }),
            el.heading("Markets, clearly explained", {
              level: "h2",
              fontSize: 42,
              fontWeight: "800",
              color: theme.text,
              marginBottom: 16,
              letterSpacing: "-0.03em",
              lineHeight: "1.1",
            }),
            el.text(
              "Every Thursday, a 5-minute read on the macro, flows, and themes shaping next week. Free. Written by analysts, not robots.",
              {
                fontSize: 17,
                lineHeight: "1.65",
                color: theme.textMuted,
                marginBottom: 28,
              }
            ),
          ]),
          rows: [
            row(
              [
                col(65, [
                  el.text("you@company.com", {
                    fontSize: 15,
                    color: theme.textDim,
                    backgroundColor: theme.bgCard,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: theme.border,
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
              { gutter: 10, maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
            ),
            row(
              [
                col(100, [
                  el.text("Join 38,000+ readers. Unsubscribe anytime.", {
                    fontSize: 13,
                    color: theme.textDim,
                    marginTop: 16,
                    marginBottom: 0,
                  }),
                ]),
              ],
              { gutter: 0, maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
            ),
          ],
        },
        col(50, [
          el.image(
            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
            "Newsletter on a laptop",
            {
              width: "100%",
              height: "auto",
              borderRadius: 20,
              marginBottom: 0,
              boxShadowY: 20,
              boxShadowBlur: 60,
              boxShadowColor: "rgba(10,18,32,0.12)",
            }
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 56, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Split Image Newsletter",
    description: "Copy and signup form on the left, supporting illustration on the right",
    category: "newsletter",
    slug: "newsletter-split-image",
    settings: {
      ...sectionPresets.compact,
      backgroundColor: theme.bgBase,
    },
  }
);
