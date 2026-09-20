import type { Section } from "@/types/builder";
import { el, row, col, section, gradients, sectionPresets, theme } from "../../utils";

export const headerGradientBar: Section = section(
  [
    row([
      col(25, [
        el.heading("Ascend", {
          level: "h1",
          fontSize: 22,
          fontWeight: "700",
          marginBottom: 0,
          letterSpacing: "-0.02em",
          color: theme.onBand,
        }),
      ]),
      col(50, [
        el.link("Platform", "#platform", {
          marginRight: 28,
          color: theme.onBandMuted,
        }),
        el.link("Solutions", "#solutions", {
          marginRight: 28,
          color: theme.onBandMuted,
        }),
        el.link("Pricing", "#pricing", {
          marginRight: 28,
          color: theme.onBandMuted,
        }),
        el.link("Resources", "#resources", {
          marginRight: 0,
          color: theme.onBandMuted,
        }),
      ], { textAlign: "center" }),
      col(25, [
        el.button("Get started", "/signup", {
          backgroundColor: theme.onBandSurface,
          color: theme.onBandSurfaceInk,
          size: "md",
          fontSize: 14,
          fontWeight: "600",
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 22,
          paddingRight: 22,
          marginRight: 0,
          marginTop: 0,
        }),
      ], { textAlign: "right" }),
    ]),
  ],
  {
    name: "Gradient Bar Header",
    description: "Gradient background (indigo to pink) with logo, nav, and CTA",
    category: "header",
    slug: "header-gradient-bar",
    type: "fullwidth",
    settings: {
      ...sectionPresets.bar,
      backgroundColor: gradients.indigoViolet,
    },
  }
);
