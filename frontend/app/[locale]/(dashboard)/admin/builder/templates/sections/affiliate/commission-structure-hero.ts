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

const bullet = (label: string) =>
  col(100, [
    el.text(`✓  ${label}`, {
      fontSize: 15,
      color: theme.onBandMuted,
      fontWeight: "500",
      marginBottom: 0,
    }),
  ]);

export const affiliateCommissionStructureHero: Section = section(
  [
    row(
      [
        col(55, [
          el.text("AFFILIATE PROGRAM", {
            fontSize: 12,
            fontWeight: "800",
            color: theme.onBandMuted,
            letterSpacing: "0.22em",
            marginBottom: 18,
          }),
          el.heading("Earn up to 50% commission, for life", {
            level: "h1",
            fontSize: 64,
            fontWeight: "800",
            color: theme.onBand,
            letterSpacing: "-0.035em",
            lineHeight: "1.05",
            marginBottom: 20,
          }),
          el.text(
            "Refer traders, merchants, and creators. Get paid monthly, in crypto or USDT, with no earnings cap. Our top affiliates cleared $87,000 last quarter.",
            {
              fontSize: 19,
              color: theme.onBandMuted,
              marginBottom: 28,
              lineHeight: "1.6",
              maxWidth: "560px",
            }
          ),
          row(
            [bullet("90-day cookie window"), bullet("Lifetime revenue share")],
            { gutter: 16, maxWidth: "100%", paddingTop: 0, paddingBottom: 0, marginBottom: 12 }
          ) as any,
          row(
            [bullet("Weekly USDT payouts"), bullet("Real-time dashboard")],
            { gutter: 16, maxWidth: "100%", paddingTop: 0, paddingBottom: 0, marginBottom: 32 }
          ) as any,
          el.button("Join the program", "/affiliate/apply", {
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            fontSize: 16,
            paddingLeft: 36,
            paddingRight: 36,
            marginRight: 12,
          }),
          el.button("See commission tiers", "#tiers", {
            backgroundColor: theme.onBandFill,
            color: theme.onBand,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.onBandBorder,
            marginRight: 0,
          }),
        ]),
        col(45, [
          (col(
            100,
            [
              el.text("Up to", {
                fontSize: 14,
                color: theme.onBandDim,
                letterSpacing: "0.16em",
                textAlign: "center",
                marginBottom: 8,
              }),
              el.heading("50%", {
                level: "h2",
                fontSize: 180,
                fontWeight: "800",
                textAlign: "center",
                // Pinned ink — the hero ground is a deliberate dark band.
                color: theme.onBand,
                letterSpacing: "-0.05em",
                lineHeight: "1",
                marginBottom: 12,
              }),
              el.text("of every trading fee", {
                fontSize: 18,
                color: theme.onBandMuted,
                textAlign: "center",
                fontWeight: "500",
                marginBottom: 0,
              }),
            ],
            {
              backgroundColor: theme.onBandFill,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: theme.onBandFill,
              borderRadius: 24,
              paddingTop: 40,
              paddingBottom: 40,
              paddingLeft: 32,
              paddingRight: 32,
            }
          )) as any,
        ], { textAlign: "center" }),
      ],
      { ...rowPresets.wide, gutter: 40, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Commission Structure Hero",
    description: "Affiliate hero with 50% callout, perks, and dual CTAs",
    category: "affiliate",
    slug: "affiliate-commission-structure-hero",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: {
        type: "gradient",
        gradient: {
          direction: "to-br",
          from: "#1e1b4b",
          via: "#312e81",
          to: "#4c1d95",
          light: { direction: "to-br", from: "#312e81", via: "#4338ca", to: "#6d28d9" },
          dark: { direction: "to-br", from: "#020617", via: "#1e1b4b", to: "#4c1d95" },
        },
      } as any,
    },
  }
);
