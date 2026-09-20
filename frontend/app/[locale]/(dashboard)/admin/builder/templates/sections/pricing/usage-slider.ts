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

export const pricingUsageSlider: Section = section(
  [
    singleColumnRow([
      el.text("USAGE-BASED PRICING", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 16,
      }),
      el.heading("Pay only for what you execute", {
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: "-0.03em",
        marginBottom: 16,
      }),
      el.text("Slide to estimate your monthly cost based on execution volume.", {
        fontSize: 18,
        textAlign: "center",
        marginBottom: 56,
      }),
    ]),
    row(
      [
        col(100, [
          el.card(
            {
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 24,
              padding: 48,
              maxWidth: "820px",
              marginLeft: "auto",
              marginRight: "auto",
            },
            [
              row(
                [
                  col(50, [
                    el.text("MONTHLY VOLUME", {
                      fontSize: 11,
                      fontWeight: "700",
                      color: theme.textMuted,
                      letterSpacing: "0.14em",
                      marginBottom: 8,
                    }),
                    el.heading("2.4M orders", {
                      level: "h3",
                      fontSize: 32,
                      fontWeight: "800",
                      letterSpacing: "-0.02em",
                      marginBottom: 0,
                    }),
                  ]),
                  col(50, [
                    el.text("ESTIMATED COST", {
                      fontSize: 11,
                      fontWeight: "700",
                      color: theme.textMuted,
                      letterSpacing: "0.14em",
                      marginBottom: 8,
                      textAlign: "right",
                    }),
                    el.heading("$1,249", {
                      level: "h3",
                      fontSize: 32,
                      fontWeight: "800",
                      letterSpacing: "-0.02em",
                      textAlign: "right",
                      color: theme.primary,
                      marginBottom: 0,
                    }),
                  ]),
                ],
                { gutter: 24, marginBottom: 32 }
              ),
              el.card(
                {
                  backgroundColor: theme.bgMuted,
                  borderWidth: 0,
                  borderRadius: 999,
                  padding: 4,
                  height: "12px",
                  marginBottom: 12,
                  position: "relative",
                },
                []
              ),
              el.card(
                {
                  backgroundColor: gradients.indigoViolet,
                  borderWidth: 0,
                  borderRadius: 999,
                  padding: 4,
                  height: "12px",
                  width: "62%",
                  marginTop: -16,
                  marginBottom: 20,
                },
                []
              ),
              row(
                [
                  col(33.33, [
                    el.text("10K orders", {
                      fontSize: 12,
                      color: theme.textMuted,
                      marginBottom: 0,
                    }),
                  ]),
                  col(33.33, [
                    el.text("5M orders", {
                      fontSize: 12,
                      color: theme.textMuted,
                      textAlign: "center",
                      marginBottom: 0,
                    }),
                  ]),
                  col(33.33, [
                    el.text("10M+ orders", {
                      fontSize: 12,
                      color: theme.textMuted,
                      textAlign: "right",
                      marginBottom: 0,
                    }),
                  ]),
                ],
                { gutter: 0, marginBottom: 32 }
              ),
              el.list(
                [
                  "$0.00052 per order — flat across all volume",
                  "Unlimited API calls and webhooks included",
                  "No minimums, no commitments, cancel anytime",
                  "Volume discounts automatic above 5M orders",
                ],
                { marginBottom: 32 }
              ),
              el.button("Start metering usage", "/signup", {
                width: "100%",
                fontSize: 15,
                marginRight: 0,
              }),
            ]
          ),
        ]),
      ],
      { ...rowPresets.contained }
    ),
  ],
  {
    name: "Usage Slider",
    description: "Visual volume slider with a real-time cost estimate card",
    category: "pricing",
    slug: "pricing-usage-slider",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
