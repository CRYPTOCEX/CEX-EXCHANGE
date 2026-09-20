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

export const ctaTestimonialCta: Section = section(
  [
    singleColumnRow([
      el.text("CUSTOMER STORY", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 24,
      }),
      el.quote(
        "We cut our execution costs by 38% in the first quarter and retired three legacy vendors. The team ships features faster than we can request them.",
        "Elena Marsh, Head of Trading at Citron Capital",
        {
          fontSize: 30,
          lineHeight: "1.45",
          fontWeight: "600",
          textAlign: "center",
          color: theme.text,
          letterSpacing: "-0.01em",
          marginBottom: 40,
          maxWidth: "860px",
          marginLeft: "auto",
          marginRight: "auto",
        }
      ),
    ]),
    row(
      [
        col(
          100,
          [
            el.image(
              "https://i.pravatar.cc/128?img=47",
              "Elena Marsh",
              {
                width: "64px",
                height: "64px",
                borderRadius: 999,
                marginBottom: 12,
                marginLeft: "auto",
                marginRight: "auto",
              }
            ),
            el.text("Elena Marsh", {
              fontSize: 15,
              fontWeight: "700",
              textAlign: "center",
              color: theme.text,
              marginBottom: 4,
            }),
            el.text("Head of Trading, Citron Capital", {
              fontSize: 14,
              textAlign: "center",
              color: theme.textMuted,
              marginBottom: 36,
            }),
            el.button("Read the case study", "/customers/citron", {
              fontSize: 15,
              paddingLeft: 28,
              paddingRight: 28,
              marginRight: 0,
            }),
          ],
          { textAlign: "center" }
        ),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Testimonial CTA",
    description: "Customer quote with avatar attribution above a primary CTA",
    category: "cta",
    slug: "cta-testimonial-cta",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
