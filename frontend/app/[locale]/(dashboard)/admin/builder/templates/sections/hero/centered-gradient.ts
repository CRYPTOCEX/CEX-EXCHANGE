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

export const heroCenteredGradient: Section = section(
  [
    singleColumnRow([
      el.text("NEW — v5 just landed", {
        fontSize: 13,
        fontWeight: "600",
        textAlign: "center",
        color: theme.onBand,
        backgroundColor: theme.onBandFill,
        borderRadius: 999,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        marginBottom: 24,
        maxWidth: "220px",
        letterSpacing: "0.08em",
      }),
      el.heading("The operating system for modern trading", {
        level: "h1",
        fontSize: 72,
        fontWeight: "800",
        textAlign: "center",
        color: theme.onBand,
        marginBottom: 24,
        letterSpacing: "-0.03em",
        lineHeight: "1.05",
        maxWidth: "980px",
      }),
      el.text(
        "Real-time charts, automation, and analytics in one professional workspace built for traders who move fast.",
        {
          fontSize: 20,
          textAlign: "center",
          color: theme.onBandMuted,
          maxWidth: "720px",
          marginBottom: 40,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(100, [
          el.button("Start free trial", "/signup", {
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            fontSize: 16,
            marginRight: 12,
          }),
          el.button("Watch demo", "/demo", {
            backgroundColor: theme.onBandFill,
            color: theme.onBand,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.onBandBorder,
            fontSize: 16,
          }),
        ], { textAlign: "center" }),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Centered Gradient Hero",
    description: "Centered hero with gradient background, large heading, and dual CTAs",
    category: "hero",
    slug: "hero-centered-gradient",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: gradients.indigoViolet,
    },
  }
);
