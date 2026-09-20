import type { Section } from "@/types/builder";
import {
  el,
  section,
  singleColumnRow,
  sectionPresets,
  theme,
} from "../../utils";

export const ctaFullBleedVideo: Section = section(
  [
    singleColumnRow(
      [
        el.text("WATCH THE 90-SECOND TOUR", {
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
          marginBottom: 28,
          maxWidth: "300px",
          letterSpacing: "0.1em",
        }),
        el.heading("See how we execute in 20ms", {
          level: "h2",
          fontSize: 64,
          fontWeight: "800",
          textAlign: "center",
          color: theme.onBand,
          marginBottom: 20,
          letterSpacing: "-0.03em",
          lineHeight: "1.05",
          maxWidth: "860px",
        }),
        el.text(
          "Watch a real order flow from signal to settlement — across 14 venues, reconciled in real time.",
          {
            fontSize: 20,
            textAlign: "center",
            color: theme.onBandMuted,
            maxWidth: "680px",
            marginBottom: 40,
            lineHeight: "1.55",
          }
        ),
        el.button("Play the demo", "/demo", {
          backgroundColor: theme.onBandSurface,
          color: theme.onBandSurfaceInk,
          fontSize: 16,
          paddingLeft: 36,
          paddingRight: 36,
        }),
      ],
      { textAlign: "center" }
    ),
  ],
  {
    name: "Full-Bleed Video CTA",
    description: "Full-bleed background image with dark overlay and a centered play CTA",
    category: "cta",
    slug: "cta-full-bleed-video",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundImage:
        "url(https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=2400&q=80)",
      /* Per-section scrim — see the note in hero/video-background.ts. Tuned to
         this composition, not shared. */
      backgroundOverlay: "rgba(10,18,32,0.7)",
      backgroundColor: theme.bandInk,
    },
  }
);
