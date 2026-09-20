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

export const testimonialsCarouselSingle: Section = section(
  [
    singleColumnRow([
      el.text("CUSTOMER STORIES", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 16,
      }),
    ]),
    row(
      [
        col(100, [
          el.card(
            {
              padding: 64,
              borderRadius: 24,
              backgroundColor: theme.bgSubtle,
              borderWidth: 0,
            },
            [
              el.image(
                "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&q=80",
                "Portrait of Daniel Voss",
                {
                  width: "80px",
                  height: "80px",
                  borderRadius: 999,
                  marginBottom: 28,
                }
              ),
              el.quote(
                "We replaced three legacy vendors with one platform and watched slippage drop by 18% in the first month. Our traders finally get the tooling they deserve.",
                "Daniel Voss",
                {
                  fontSize: 30,
                  lineHeight: "1.4",
                  color: theme.text,
                  marginBottom: 32,
                  fontWeight: "500",
                  letterSpacing: "-0.01em",
                }
              ),
              el.text("Daniel Voss", {
                fontSize: 18,
                fontWeight: "600",
                color: theme.text,
                marginBottom: 4,
              }),
              el.text("Chief Trading Officer, Axiom Markets", {
                fontSize: 15,
                color: theme.textMuted,
                marginBottom: 32,
              }),
              el.text("  <  1 / 8  >  ", {
                fontSize: 14,
                color: theme.textDim,
                fontWeight: "600",
                letterSpacing: "0.08em",
                marginBottom: 0,
              }),
            ]
          ),
        ]),
      ],
      { ...rowPresets.narrow }
    ),
  ],
  {
    name: "Featured Carousel",
    description: "Single large featured quote with carousel indicators",
    category: "testimonials",
    slug: "testimonials-carousel-single",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
