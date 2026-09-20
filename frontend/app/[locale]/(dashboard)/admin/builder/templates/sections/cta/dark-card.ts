import type { Section } from "@/types/builder";
import {
  el,
  section,
  singleColumnRow,
  theme,
  sectionPresets,
} from "../../utils";

export const ctaDarkCard: Section = section(
  [
    singleColumnRow(
      [
        el.card(
          {
            backgroundColor: theme.bandInk,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 28,
            padding: 72,
            maxWidth: "1040px",
            marginLeft: "auto",
            marginRight: "auto",
            textAlign: "center",
            boxShadowX: 0,
            boxShadowY: 30,
            boxShadowBlur: 80,
            boxShadowSpread: -24,
            boxShadowColor: "rgba(31,113,235,0.35)",
          },
          [
            el.text("LIMITED-TIME OFFER", {
              fontSize: 12,
              fontWeight: "700",
              textAlign: "center",
              color: theme.primary,
              letterSpacing: "0.14em",
              marginBottom: 20,
            }),
            el.heading("Upgrade to Pro and unlock every feature", {
              fontSize: 52,
              fontWeight: "800",
              textAlign: "center",
              color: theme.onBand,
              letterSpacing: "-0.03em",
              lineHeight: "1.08",
              marginBottom: 18,
              maxWidth: "780px",
              marginLeft: "auto",
              marginRight: "auto",
            }),
            el.text(
              "Advanced charting, unlimited alerts, API access, and priority support — save 30% on annual plans through April.",
              {
                fontSize: 18,
                textAlign: "center",
                color: theme.onBandDim,
                marginBottom: 36,
                maxWidth: "640px",
                marginLeft: "auto",
                marginRight: "auto",
              }
            ),
            el.button("Upgrade to Pro", "/upgrade", {
              fontSize: 16,
              marginRight: 12,
            }),
            el.button("Compare plans", "/pricing", {
              backgroundColor: theme.onBandFill,
              color: theme.onBand,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: theme.onBandBorder,
              fontSize: 16,
            }),
          ]
        ),
      ],
      { textAlign: "center" }
    ),
  ],
  {
    name: "Dark Card CTA",
    description: "Contained dark card with centered content on a light section background",
    category: "cta",
    slug: "cta-dark-card",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
