import type { Section } from "@/types/builder";
import {
  el,
  section,
  singleColumnRow,
  theme,
  gradients,
  sectionPresets,
} from "../../utils";

export const ctaGradientBorder: Section = section(
  [
    singleColumnRow(
      [
        el.card(
          {
            backgroundColor: gradients.aurora,
            borderRadius: 24,
            padding: 3,
            maxWidth: "960px",
            marginLeft: "auto",
            marginRight: "auto",
            animationType: "glow",
            animationDuration: 4000,
            animationIterationCount: "infinite",
          },
          [
            el.card(
              {
                backgroundColor: theme.bgCard,
                borderRadius: 22,
                padding: 64,
                textAlign: "center",
                borderWidth: 0,
              },
              [
                el.text("NEW INTEGRATION", {
                  fontSize: 12,
                  fontWeight: "700",
                  textAlign: "center",
                  color: theme.primary,
                  letterSpacing: "0.14em",
                  marginBottom: 20,
                }),
                el.heading("One workspace. Every exchange. Zero switching.", {
                  fontSize: 46,
                  fontWeight: "800",
                  textAlign: "center",
                  letterSpacing: "-0.03em",
                  lineHeight: "1.1",
                  marginBottom: 18,
                  maxWidth: "720px",
                  marginLeft: "auto",
                  marginRight: "auto",
                }),
                el.text(
                  "Connect Binance, Coinbase, Kraken, and 20 more venues in a unified interface. Free forever for the first 10,000 users.",
                  {
                    fontSize: 17,
                    textAlign: "center",
                    marginBottom: 32,
                    maxWidth: "600px",
                    marginLeft: "auto",
                    marginRight: "auto",
                  }
                ),
                el.button("Claim your spot", "/early-access", {
                  fontSize: 16,
                  paddingLeft: 32,
                  paddingRight: 32,
                }),
              ]
            ),
          ]
        ),
      ],
      { textAlign: "center" }
    ),
  ],
  {
    name: "Gradient Border CTA",
    description: "Light card with an animated gradient border effect",
    category: "cta",
    slug: "cta-gradient-border",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
