import type { Section } from "@/types/builder";
import {
  el,
  section,
  singleColumnRow,
  theme,
  sectionPresets,
} from "../../utils";

export const ctaBadgeAbove: Section = section(
  [
    singleColumnRow(
      [
        el.text("BETA", {
          fontSize: 12,
          fontWeight: "800",
          textAlign: "center",
          color: theme.primaryText,
          backgroundColor: theme.primary,
          borderRadius: 999,
          paddingTop: 6,
          paddingBottom: 6,
          paddingLeft: 14,
          paddingRight: 14,
          marginBottom: 24,
          maxWidth: "80px",
          marginLeft: "auto",
          marginRight: "auto",
          letterSpacing: "0.16em",
        }),
        el.heading("AI Copilot is now open to everyone", {
          fontSize: 56,
          fontWeight: "800",
          textAlign: "center",
          letterSpacing: "-0.03em",
          lineHeight: "1.08",
          marginBottom: 18,
          maxWidth: "820px",
          marginLeft: "auto",
          marginRight: "auto",
        }),
        el.text(
          "Generate strategies in plain English, backtest in seconds, deploy in one click. Free during beta.",
          {
            fontSize: 19,
            textAlign: "center",
            marginBottom: 36,
            maxWidth: "620px",
            marginLeft: "auto",
            marginRight: "auto",
          }
        ),
        el.button("Try Copilot free", "/copilot", {
          fontSize: 16,
          paddingLeft: 36,
          paddingRight: 36,
          marginRight: 0,
        }),
      ],
      { textAlign: "center" }
    ),
  ],
  {
    name: "Badge Above CTA",
    description: "NEW/BETA badge above a headline, supporting copy, and a single primary CTA",
    category: "cta",
    slug: "cta-badge-above",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
