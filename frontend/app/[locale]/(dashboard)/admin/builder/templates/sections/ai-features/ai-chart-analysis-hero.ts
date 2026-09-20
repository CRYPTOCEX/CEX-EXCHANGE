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

export const aiFeaturesAiChartAnalysisHero: Section = section(
  [
    singleColumnRow([
      el.text("POWERED BY MASH AI", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.onBand,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 20,
      }),
      el.heading("AI-powered chart analysis that reads the tape for you", {
        level: "h1",
        fontSize: 68,
        fontWeight: "800",
        textAlign: "center",
        color: theme.onBand,
        letterSpacing: "-0.035em",
        lineHeight: "1.05",
        marginBottom: 24,
        maxWidth: "960px",
      }),
      el.text(
        "Point Mash AI at any chart — it finds patterns, support / resistance levels, divergences, and generates plain-English commentary in under 4 seconds.",
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
    singleColumnRow(
      [
        el.button("Analyze a chart", "/ai/analyze", {
          backgroundColor: theme.onBandSurface,
          color: theme.onBandSurfaceInk,
          fontSize: 16,
          paddingLeft: 32,
          paddingRight: 32,
          marginRight: 12,
        }),
        el.button("Watch the 90-sec demo", "/ai/demo", {
          backgroundColor: theme.onBandFill,
          color: theme.onBand,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.onBandBorder,
          marginRight: 0,
        }),
      ],
      { textAlign: "center" }
    ),
    singleColumnRow(
      [
        el.image(
          "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=2000&q=85",
          "Chart analysis showing AI-detected trend lines and annotations",
          {
            borderRadius: 20,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.onBandFill,
            boxShadowX: 0,
            boxShadowY: 40,
            boxShadowBlur: 100,
            // Decorative violet glow. Shadows need an alpha, and no token
            // carries one, so this stays literal — but the hue is now
            // `theme.bandViolet` (#6c3e9b) rather than an off-palette purple.
            boxShadowColor: "rgba(108,62,155,0.5)",
            marginTop: 56,
            maxWidth: "1160px",
          }
        ),
      ],
      { ...rowPresets.wide, textAlign: "center" }
    ),
  ],
  {
    name: "AI Chart Analysis Hero",
    description: "Dark AI-first hero pitching Mash AI chart analysis",
    category: "ai-features",
    slug: "ai-features-ai-chart-analysis-hero",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: {
        type: "gradient",
        gradient: {
          direction: "to-br",
          from: "#020617",
          via: "#1e1b4b",
          to: "#3b0764",
          light: { direction: "to-br", from: "#0f172a", via: "#4338ca", to: "#6d28d9" },
          dark: { direction: "to-br", from: "#020617", via: "#1e1b4b", to: "#3b0764" },
        },
      } as any,
    },
  }
);
