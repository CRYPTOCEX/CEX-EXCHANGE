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

export const tradingLiveChartHero: Section = section(
  [
    singleColumnRow([
      el.text("LIVE MARKETS", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.sky,
        letterSpacing: "0.2em",
        marginBottom: 20,
      }),
      el.heading("Trade crypto at the speed of the market", {
        level: "h1",
        fontSize: 72,
        fontWeight: "800",
        textAlign: "center",
        color: theme.onBand,
        letterSpacing: "-0.035em",
        lineHeight: "1.02",
        marginBottom: 24,
        maxWidth: "960px",
      }),
      el.text(
        "Your own matching engine, deep liquidity across 150+ pairs, and a charting stack built by traders for traders.",
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
          el.button("Start trading now", "/trade", {
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            fontSize: 16,
            paddingLeft: 32,
            paddingRight: 32,
            marginRight: 12,
          }),
          el.button("Open a demo account", "/demo", {
            backgroundColor: theme.onBandFill,
            color: theme.onBand,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.onBandBorder,
            fontSize: 16,
            paddingLeft: 28,
            paddingRight: 28,
          }),
        ], { textAlign: "center" }),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
    singleColumnRow(
      [
        el.image(
          "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=2000&q=85",
          "Live trading chart with candlesticks and volume",
          {
            borderRadius: 20,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.onBandFill,
            boxShadowX: 0,
            boxShadowY: 40,
            boxShadowBlur: 100,
            // Decorative teal glow. A shadow needs an alpha and no token
            // carries one, so this stays literal — but the hue is now
            // `theme.bandInfo` (#095c71) rather than an off-palette cyan.
            boxShadowColor: "rgba(9,92,113,0.5)",
            marginTop: 56,
            maxWidth: "1160px",
          }
        ),
      ],
      { ...rowPresets.wide, textAlign: "center" }
    ),
  ],
  {
    name: "Live Chart Hero",
    description: "Hero with live chart screenshot background and trading CTAs",
    category: "trading",
    slug: "trading-live-chart-hero",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: {
        type: "gradient",
        gradient: {
          direction: "to-br",
          from: "#020617",
          via: "#0c1a3b",
          to: "#0e7490",
          light: { direction: "to-br", from: "#0f172a", via: "#1e3a8a", to: "#0e7490" },
          dark: { direction: "to-br", from: "#020617", via: "#0c1a3b", to: "#0e7490" },
        },
      } as any,
    },
  }
);
