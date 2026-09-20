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

export const ecommerceNewsletterShopDiscount: Section = section(
  [
    row(
      [
        col(55, [
          el.text("JOIN THE LIST", {
            fontSize: 12,
            fontWeight: "800",
            color: theme.primary,
            letterSpacing: "0.22em",
            marginBottom: 16,
          }),
          el.heading("Get 10% off your first order", {
            level: "h2",
            fontSize: 48,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 18,
            letterSpacing: "-0.03em",
            lineHeight: "1.1",
          }),
          el.text(
            "Plus early access to new drops, subscriber-only sales, and styling tips from our team. Unsubscribe in one click, anytime.",
            {
              fontSize: 17,
              color: theme.textMuted,
              marginBottom: 32,
              lineHeight: "1.65",
              maxWidth: "480px",
            }
          ),
          row(
            [
              col(
                65,
                [
                  el.text("you@email.com", {
                    fontSize: 15,
                    color: theme.textMuted,
                    marginBottom: 0,
                    paddingTop: 16,
                    paddingBottom: 16,
                    paddingLeft: 18,
                    paddingRight: 18,
                    backgroundColor: theme.bgCard,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: theme.border,
                  }),
                ],
                { paddingLeft: 0, paddingRight: 4 }
              ),
              col(
                35,
                [
                  el.button("Get the code", "#subscribe", {
                    backgroundColor: theme.cssPrimary,
                    color: theme.cssPrimaryInk,
                    fontSize: 15,
                    width: "100%",
                    marginTop: 0,
                    marginRight: 0,
                    paddingTop: 16,
                    paddingBottom: 16,
                    textAlign: "center",
                  }),
                ],
                { paddingLeft: 4, paddingRight: 0 }
              ),
            ],
            { gutter: 0, maxWidth: "480px", verticalAlign: "middle", paddingTop: 0, paddingBottom: 0 }
          ) as any,
          el.text(
            "By subscribing, you agree to our privacy policy. No spam — just the good stuff.",
            {
              fontSize: 12,
              color: theme.textDim,
              marginTop: 16,
              marginBottom: 0,
            }
          ),
        ]),
        col(45, [
          el.image(
            "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=85",
            "Folded clothes in neutral tones arranged on bed",
            {
              borderRadius: 24,
              width: "100%",
              height: "auto",
              boxShadowX: 0,
              boxShadowY: 30,
              boxShadowBlur: 60,
              boxShadowColor: "rgba(10,18,32,0.1)",
            }
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 48, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Newsletter Shop Discount",
    description: "Newsletter signup with 10% off incentive and product imagery",
    category: "ecommerce",
    slug: "ecommerce-newsletter-shop-discount",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
