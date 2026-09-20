import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

export const tradingMobileAppShowcase: Section = section(
  [
    row(
      [
        col(50, [
          el.text("MOBILE TRADING", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.primary,
            letterSpacing: "0.18em",
            marginBottom: 16,
          }),
          el.heading("The whole exchange, in your pocket", {
            fontSize: 54,
            fontWeight: "800",
            letterSpacing: "-0.03em",
            lineHeight: "1.05",
            marginBottom: 20,
          }),
          el.text(
            "Trade, monitor bots, and manage risk on the go. Our native iOS and Android apps ship the same order engine as the desktop client — no compromises.",
            {
              fontSize: 18,
              color: theme.textMuted,
              marginBottom: 32,
              lineHeight: "1.65",
              maxWidth: "500px",
            }
          ),
          el.list(
            [
              "Face ID / fingerprint unlock and hardware-backed signing",
              "Real-time price alerts, even when the app is closed",
              "Full charting with 60+ indicators — no feature lock-outs",
              "One-tap copy-trading and bot controls",
              "Biometric withdrawal confirmations",
            ],
            { fontSize: 16, marginBottom: 32 }
          ),
          el.button("Get iOS app", "/app/ios", {
            fontSize: 15,
            marginRight: 12,
          }),
          el.button("Get Android app", "/app/android", {
            backgroundColor: "transparent",
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            fontSize: 15,
          }),
        ]),
        col(50, [
          el.image(
            "https://images.unsplash.com/photo-1607863680198-23d4b2565df0?w=900&q=85",
            "Mobile trading app showing live charts and portfolio",
            {
              borderRadius: 24,
              maxWidth: "480px",
              boxShadowX: 0,
              boxShadowY: 40,
              boxShadowBlur: 80,
              boxShadowSpread: -20,
              boxShadowColor: "rgba(31,113,235,0.4)",
            }
          ),
        ], { textAlign: "center" }),
      ],
      { ...rowPresets.wide, gutter: 64, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Mobile App Showcase",
    description: "Phone mockup with feature bullets about mobile trading",
    category: "trading",
    slug: "trading-mobile-app-showcase",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
