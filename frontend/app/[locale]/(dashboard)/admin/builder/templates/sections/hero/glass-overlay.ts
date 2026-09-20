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

export const heroGlassOverlay: Section = section(
  [
    row(
      [
        col(60, [
          el.text("ENTERPRISE", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.onBand,
            backgroundColor: theme.onBandFill,
            borderRadius: 999,
            paddingTop: 6,
            paddingBottom: 6,
            paddingLeft: 14,
            paddingRight: 14,
            marginBottom: 24,
            maxWidth: "120px",
            letterSpacing: "0.14em",
          }),
          el.heading("Institutional-grade infrastructure, built for builders", {
            level: "h1",
            fontSize: 56,
            fontWeight: "800",
            letterSpacing: "-0.025em",
            lineHeight: "1.08",
            color: theme.onBand,
            marginBottom: 20,
          }),
          el.text(
            "Infrastructure you own, keys you control, and an audit trail on every action — so your team can ship without compromise.",
            {
              fontSize: 18,
              color: theme.onBandMuted,
              marginBottom: 32,
              lineHeight: "1.65",
              maxWidth: "520px",
            }
          ),
          el.button("Schedule a briefing", "/enterprise", {
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            fontSize: 16,
            marginRight: 12,
          }),
          el.button("Read the docs", "/docs", {
            backgroundColor: "transparent",
            color: theme.onBand,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.onBandDim,
            fontSize: 16,
          }),
        ], {
          backgroundColor: theme.overlay,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.onBandBorder,
          borderRadius: 24,
          padding: 48,
          backdropFilter: "blur(24px)",
        }),
        col(40, []),
      ],
      { ...rowPresets.wide, gutter: 24 }
    ),
  ],
  {
    name: "Glass Overlay Hero",
    description: "Photographic background with a translucent glass-morphism copy card",
    category: "hero",
    slug: "hero-glass-overlay",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      paddingTop: 140,
      paddingBottom: 140,
      backgroundImage:
        "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=2400&q=80",
      /* Per-section scrim — see the note in hero/video-background.ts. Tuned to
         this composition, not shared. */
      backgroundOverlay: "rgba(10,18,32,0.4)",
      backgroundColor: theme.bandInk,
    },
  }
);
