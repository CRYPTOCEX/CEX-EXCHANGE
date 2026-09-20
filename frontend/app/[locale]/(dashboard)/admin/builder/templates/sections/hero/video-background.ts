import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

export const heroVideoBackground: Section = section(
  [
    singleColumnRow([
      el.text("CINEMATIC", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.onBandMuted,
        letterSpacing: "0.2em",
        marginBottom: 24,
      }),
      el.heading("Markets, in motion.", {
        level: "h1",
        fontSize: 88,
        fontWeight: "800",
        textAlign: "center",
        color: theme.onBand,
        marginBottom: 24,
        letterSpacing: "-0.04em",
        lineHeight: "1.02",
        maxWidth: "900px",
      }),
      el.text(
        "A live view of global liquidity, rendered in real time. See the signal, skip the noise.",
        {
          fontSize: 22,
          textAlign: "center",
          color: theme.onBandMuted,
          maxWidth: "640px",
          marginBottom: 40,
          lineHeight: "1.55",
        }
      ),
    ]),
    row(
      [
        col(100, [
          el.button("Watch the film", "/film", {
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            fontSize: 16,
            marginRight: 12,
          }),
          el.button("Request access", "/access", {
            backgroundColor: "transparent",
            color: theme.onBand,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.onBandDim,
            fontSize: 16,
          }),
        ], { textAlign: "center" }),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Video Background Hero",
    description: "Full-bleed cinematic background with dark overlay and centered copy",
    category: "hero",
    slug: "hero-video-background",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      paddingTop: 160,
      paddingBottom: 160,
      backgroundImage:
        "https://images.unsplash.com/photo-1605792657660-596af9009e82?w=2400&q=80",
      /* Per-section scrim, deliberately NOT theme.overlay. The alpha is tuned to
         how much ink sits DIRECTLY on the photograph in this particular
         composition, so the four photo sections legitimately carry four
         different values. Flattening them onto one token weakened this one from
         0.65 to 0.60 and pushed the eyebrow from 4.58:1 to 3.92:1 over bright
         areas of the image. Photo overlays stay literal. */
      backgroundOverlay: "rgba(10,18,32,0.65)",
      backgroundColor: theme.bandInk,
    },
  }
);
