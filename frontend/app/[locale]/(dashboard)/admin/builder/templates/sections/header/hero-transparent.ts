import type { Section } from "@/types/builder";
import { el, row, col, section, theme, sectionPresets } from "../../utils";

export const headerHeroTransparent: Section = section(
  [
    row([
      col(30, [
        el.heading("Bitfinity", {
          level: "h1",
          fontSize: 22,
          fontWeight: "700",
          marginBottom: 0,
          letterSpacing: "-0.02em",
          color: theme.onBand,
        }),
      ]),
      col(45, [
        el.link("Platform", "#platform", {
          marginRight: 28,
          color: theme.onBandMuted,
        }),
        el.link("Pricing", "#pricing", {
          marginRight: 28,
          color: theme.onBandMuted,
        }),
        el.link("Docs", "#docs", {
          marginRight: 28,
          color: theme.onBandMuted,
        }),
      ], { textAlign: "center" }),
      col(25, [
        el.button("Get started", "/signup", {
          backgroundColor: theme.onBandSurface,
          color: theme.onBandSurfaceInk,
          size: "md",
          fontSize: 14,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 20,
          paddingRight: 20,
          marginRight: 0,
          marginTop: 0,
        }),
      ], { textAlign: "right" }),
    ]),
  ],
  {
    name: "Hero Transparent Header",
    description: "Transparent overlay header for use above a hero, minimal nav + CTA",
    category: "header",
    slug: "header-hero-transparent",
    type: "fullwidth",
    settings: {
      ...sectionPresets.bar,
      backgroundColor: "transparent",
      position: "relative",
      zIndex: "10",
    },
  }
);
