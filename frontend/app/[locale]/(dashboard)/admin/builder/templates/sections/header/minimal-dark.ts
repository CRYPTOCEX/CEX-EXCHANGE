import type { Section } from "@/types/builder";
import { el, row, col, section, sectionPresets, theme } from "../../utils";

export const headerMinimalDark: Section = section(
  [
    row([
      col(25, [
        el.heading("Proton", {
          level: "h1",
          fontSize: 22,
          fontWeight: "700",
          marginBottom: 0,
          letterSpacing: "-0.02em",
          color: theme.onBand,
        }),
      ]),
      col(50, [
        el.link("Product", "#product", {
          marginRight: 32,
          color: theme.onBandMuted,
        }),
        el.link("Pricing", "#pricing", {
          marginRight: 32,
          color: theme.onBandMuted,
        }),
        el.link("Company", "#company", {
          marginRight: 0,
          color: theme.onBandMuted,
        }),
      ], { textAlign: "center" }),
      col(25, [
        el.button("Sign in", "/login", {
          // `ButtonElement` puts these straight into an inline style, so they
          // stay real CSS. The `onBand*` set already IS real CSS and is pinned,
          // which is what a ghost button on a pinned dark bar needs.
          backgroundColor: theme.onBandFill,
          color: theme.onBand,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.onBandBorder,
          size: "md",
          fontSize: 14,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 20,
          paddingRight: 20,
          marginRight: 0,
          marginTop: 0,
        }),
      ], { textAlign: "right" }),
    ]),
  ],
  {
    name: "Minimal Dark Header",
    description: "Dark background with logo, 3-item nav, and a single sign-in button",
    category: "header",
    slug: "header-minimal-dark",
    settings: {
      ...sectionPresets.bar,
      // "Minimal DARK header" — a pinned band by design, matching
      // `footer/minimal-dark`. Ink on it comes from `theme.onBand*`.
      backgroundColor: theme.bandInk,
      borderBottom: true,
      borderColor: theme.onBandFill,
      borderWidth: 1,
      borderStyle: "solid",
    },
  }
);
