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

export const ecommerceSaleBanner: Section = section(
  [
    row(
      [
        col(60, [
          el.text("LIMITED TIME — ENDS SUNDAY", {
            fontSize: 13,
            fontWeight: "800",
            color: theme.onBandMuted,
            letterSpacing: "0.2em",
            marginBottom: 20,
          }),
          el.heading("Up to 40% off sitewide", {
            level: "h2",
            fontSize: 72,
            fontWeight: "800",
            color: theme.onBand,
            letterSpacing: "-0.035em",
            lineHeight: "1",
            marginBottom: 20,
          }),
          el.text(
            "Everything you've been eyeing, for less. New markdowns added every 48 hours.",
            {
              fontSize: 19,
              color: theme.onBandMuted,
              marginBottom: 32,
              lineHeight: "1.6",
              maxWidth: "520px",
            }
          ),
          el.button("Shop the sale", "/shop/sale", {
            // Bright button on a pinned band: the ink has to be pinned too.
            // A theme-following red here (`cssDestructive`) drops to 3.28:1 on
            // white in dark mode, because the button ground does not fork.
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            fontSize: 16,
            paddingLeft: 36,
            paddingRight: 36,
            marginRight: 12,
          }),
          el.button("See what's new in sale", "/shop/sale/new", {
            backgroundColor: theme.onBandFill,
            color: theme.onBand,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.onBandBorder,
            marginRight: 0,
          }),
        ]),
        col(40, [
          el.heading("40%", {
            level: "h3",
            fontSize: 240,
            fontWeight: "800",
            color: theme.onBandFill,
            textAlign: "center",
            letterSpacing: "-0.05em",
            lineHeight: "1",
            marginBottom: 0,
          }),
        ], { textAlign: "center" }),
      ],
      { ...rowPresets.wide, gutter: 40, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Sale Banner",
    description: "High-impact sale banner with oversized discount % and dual CTAs",
    category: "ecommerce",
    slug: "ecommerce-sale-banner",
    type: "fullwidth",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: {
        type: "gradient",
        gradient: {
          direction: "to-br",
          from: "#7f1d1d",
          via: "#991b1b",
          to: "#b91c1c",
          light: { direction: "to-br", from: "#991b1b", via: "#b91c1c", to: "#dc2626" },
          dark: { direction: "to-br", from: "#450a0a", via: "#7f1d1d", to: "#991b1b" },
        },
      } as any,
    },
  }
);
