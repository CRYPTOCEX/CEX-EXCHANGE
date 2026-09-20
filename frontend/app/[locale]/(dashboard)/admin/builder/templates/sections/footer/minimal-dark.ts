import type { Section } from "@/types/builder";
import { el, row, col, section, theme } from "../../utils";

export const footerMinimalDark: Section = section(
  [
    row([
      col(30, [
        el.heading("Axiom", {
          level: "h3",
          fontSize: 22,
          fontWeight: "700",
          marginBottom: 0,
          letterSpacing: "-0.02em",
          color: theme.onBand,
        }),
      ]),
      col(45, [
        el.link("Product", "#product", {
          marginRight: 24,
          fontSize: 14,
          color: theme.onBandMuted,
        }),
        el.link("Pricing", "#pricing", {
          marginRight: 24,
          fontSize: 14,
          color: theme.onBandMuted,
        }),
        el.link("Docs", "#docs", {
          marginRight: 24,
          fontSize: 14,
          color: theme.onBandMuted,
        }),
        el.link("Company", "#company", {
          marginRight: 24,
          fontSize: 14,
          color: theme.onBandMuted,
        }),
        el.link("Privacy", "#privacy", {
          marginRight: 0,
          fontSize: 14,
          color: theme.onBandMuted,
        }),
      ], { textAlign: "center" }),
      col(25, [
        el.text(`© ${new Date().getFullYear()} Axiom, Inc.`, {
          fontSize: 14,
          // One step below the links, so the ranking the old 0.7/0.5 pair
          // carried survives. 10.06:1 on `bandInk`.
          color: theme.onBandDim,
          marginBottom: 0,
          textAlign: "right",
        }),
      ], { textAlign: "right" }),
    ]),
  ],
  {
    name: "Minimal Dark Footer",
    description: "Dark background with logo, five horizontal links, and copyright",
    category: "footer",
    slug: "footer-minimal-dark",
    settings: {
      paddingTop: 40,
      paddingBottom: 40,
      paddingLeft: 24,
      paddingRight: 24,
      // "Minimal DARK footer" — the slab is the design, so it stays pinned in
      // both themes and its ink is pinned with it (`theme.onBand*`). `bandInk`
      // is the vocabulary's name for exactly this ground.
      backgroundColor: theme.bandInk,
      borderTop: true,
      borderColor: theme.onBandFill,
      borderWidth: 1,
      borderStyle: "solid",
    },
  }
);
