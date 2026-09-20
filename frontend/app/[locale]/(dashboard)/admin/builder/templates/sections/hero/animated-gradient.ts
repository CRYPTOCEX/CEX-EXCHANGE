import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  theme,
  gradients,
  sectionPresets,
  rowPresets,
} from "../../utils";

export const heroAnimatedGradient: Section = section(
  [
    row(
      [
        col(100, [
          el.text("LIVE BETA", {
            fontSize: 12,
            fontWeight: "700",
            textAlign: "center",
            color: theme.onBand,
            backgroundColor: theme.onBandBorder,
            borderRadius: 999,
            paddingTop: 6,
            paddingBottom: 6,
            paddingLeft: 14,
            paddingRight: 14,
            marginBottom: 20,
            maxWidth: "110px",
            letterSpacing: "0.12em",
          }),
          el.heading("A new surface for ambitious teams", {
            level: "h1",
            fontSize: 64,
            fontWeight: "800",
            textAlign: "center",
            color: theme.onBand,
            marginBottom: 20,
            letterSpacing: "-0.03em",
            lineHeight: "1.08",
          }),
          el.text(
            "Design systems, automations, and analytics — unified in a single workspace that feels instant.",
            {
              fontSize: 19,
              textAlign: "center",
              color: theme.onBandMuted,
              marginBottom: 32,
              lineHeight: "1.6",
            }
          ),
          el.button("Claim your workspace", "/signup", {
            backgroundColor: theme.onBandSurface,
            color: "#1e1b4b",
            fontSize: 16,
            marginRight: 0,
          }),
        ], {
          backgroundColor: theme.onBandFill,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.onBandBorder,
          borderRadius: 24,
          padding: 48,
          backdropFilter: "blur(20px)",
          textAlign: "center",
        }),
      ],
      { ...rowPresets.narrow, maxWidth: "720px" }
    ),
  ],
  {
    name: "Animated Gradient Hero",
    description: "Indigo-to-pink gradient background with a centered glass-morphism card",
    category: "hero",
    slug: "hero-animated-gradient",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      paddingTop: 140,
      paddingBottom: 140,
      backgroundColor: gradients.aurora,
    },
  }
);
