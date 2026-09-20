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

export const ctaCenteredGradient: Section = section(
  [
    singleColumnRow([
      el.text("READY WHEN YOU ARE", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.onBand,
        backgroundColor: theme.onBandFill,
        borderRadius: 999,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        marginBottom: 24,
        maxWidth: "260px",
        letterSpacing: "0.08em",
      }),
      el.heading("Ship your first trading bot this week", {
        level: "h2",
        fontSize: 56,
        fontWeight: "800",
        textAlign: "center",
        color: theme.onBand,
        marginBottom: 20,
        letterSpacing: "-0.03em",
        lineHeight: "1.08",
        maxWidth: "820px",
      }),
      el.text(
        "Join 42,000+ traders automating strategies on institutional-grade infrastructure. No credit card required.",
        {
          fontSize: 19,
          textAlign: "center",
          color: theme.onBandMuted,
          maxWidth: "640px",
          marginBottom: 36,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(
          100,
          [
            el.button("Start building free", "/signup", {
              backgroundColor: theme.onBandSurface,
              color: theme.onBandSurfaceInk,
              fontSize: 16,
              marginRight: 12,
            }),
            el.button("Talk to sales", "/contact", {
              backgroundColor: theme.onBandFill,
              color: theme.onBand,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: theme.onBandBorder,
              fontSize: 16,
            }),
          ],
          { textAlign: "center" }
        ),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Centered Gradient CTA",
    description: "Centered headline and dual CTAs on a premium gradient background",
    category: "cta",
    slug: "cta-centered-gradient",
    type: "fullwidth",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: gradients.indigoViolet,
    },
  }
);
