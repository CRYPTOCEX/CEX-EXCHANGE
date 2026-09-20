import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  rowPresets,
} from "../../utils";

export const aboutFullBleedImage: Section = section(
  [
    row(
      [
        col(15, []),
        col(70, [
          el.text("ABOUT US", {
            fontSize: 14,
            fontWeight: "700",
            textAlign: "center",
            color: theme.onBand,
            letterSpacing: "0.22em",
            marginBottom: 20,
            opacity: 0.85,
          }),
          el.heading("We build the rails modern markets run on.", {
            textAlign: "center",
            fontSize: 64,
            fontWeight: "800",
            letterSpacing: "-0.03em",
            lineHeight: "1.05",
            marginBottom: 24,
            color: theme.onBand,
            maxWidth: "880px",
          }),
          el.text(
            "A privately held, engineer-led infrastructure company clearing $14 billion of monthly volume for 180,000 traders in 42 countries.",
            {
              fontSize: 20,
              lineHeight: "1.6",
              textAlign: "center",
              color: theme.onBandMuted,
              maxWidth: "720px",
              marginBottom: 36,
            }
          ),
          el.button("Read our manifesto", "/manifesto", {
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            fontSize: 16,
          }),
        ]),
        col(15, []),
      ],
      { ...rowPresets.contained, gutter: 0 }
    ),
  ],
  {
    name: "Full-Bleed Image",
    description: "Full-width photo with overlay text",
    category: "about",
    slug: "about-full-bleed-image",
    type: "fullwidth",
    settings: {
      paddingTop: 180,
      paddingBottom: 180,
      paddingLeft: 24,
      paddingRight: 24,
      backgroundImage:
        "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=2000&q=80",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      /* Per-section scrim — see the note in hero/video-background.ts. Tuned to
         this composition, not shared. */
      backgroundOverlay: "rgba(10,18,32,0.55)",
      minHeight: "600px",
    },
  }
);
