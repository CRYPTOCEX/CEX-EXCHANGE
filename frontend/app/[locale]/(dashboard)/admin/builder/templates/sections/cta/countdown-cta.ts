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

function counter(value: string, label: string) {
  return el.card(
    {
      backgroundColor: theme.onBandFill,
      borderColor: theme.onBandFill,
      borderWidth: 1,
      borderRadius: 16,
      padding: 24,
      textAlign: "center",
    },
    [
      el.heading(value, {
        level: "h3",
        fontSize: 52,
        fontWeight: "800",
        textAlign: "center",
        color: theme.onBand,
        letterSpacing: "-0.02em",
        marginBottom: 4,
        lineHeight: "1",
      }),
      el.text(label, {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.onBandDim,
        letterSpacing: "0.12em",
        marginBottom: 0,
      }),
    ]
  );
}

export const ctaCountdownCta: Section = section(
  [
    singleColumnRow([
      el.text("LAUNCHING SOON", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.onBand,
        backgroundColor: theme.onBandFill,
        borderRadius: 999,
        paddingTop: 6,
        paddingBottom: 6,
        paddingLeft: 14,
        paddingRight: 14,
        marginBottom: 24,
        maxWidth: "180px",
        letterSpacing: "0.14em",
      }),
      el.heading("Spot perpetuals go live in...", {
        fontSize: 48,
        fontWeight: "800",
        textAlign: "center",
        color: theme.onBand,
        letterSpacing: "-0.02em",
        lineHeight: "1.1",
        marginBottom: 40,
      }),
    ]),
    row(
      [
        col(25, [counter("07", "DAYS")]),
        col(25, [counter("14", "HOURS")]),
        col(25, [counter("32", "MINUTES")]),
        col(25, [counter("48", "SECONDS")]),
      ],
      { ...rowPresets.narrow, gutter: 16 }
    ),
    singleColumnRow(
      [
        el.text(
          "Join 12,000+ traders on the waitlist. Early access unlocks zero-fee trades for 30 days.",
          {
            fontSize: 17,
            textAlign: "center",
            color: theme.onBandMuted,
            marginTop: 40,
            marginBottom: 28,
            maxWidth: "620px",
            marginLeft: "auto",
            marginRight: "auto",
          }
        ),
        el.button("Join the waitlist", "/waitlist", {
          backgroundColor: theme.onBandSurface,
          color: theme.onBandSurfaceInk,
          fontSize: 16,
          paddingLeft: 32,
          paddingRight: 32,
          marginRight: 0,
        }),
      ],
      { textAlign: "center" }
    ),
  ],
  {
    name: "Countdown CTA",
    description: "Launch countdown with four counter tiles and a waitlist CTA",
    category: "cta",
    slug: "cta-countdown-cta",
    type: "fullwidth",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: gradients.nightSky,
    },
  }
);
