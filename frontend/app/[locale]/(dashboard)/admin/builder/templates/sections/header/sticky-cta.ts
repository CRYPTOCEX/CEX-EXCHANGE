import type { Section } from "@/types/builder";
import { el, row, col, section, theme, gradients, sectionPresets } from "../../utils";

export const headerStickyCta: Section = section(
  [
    row([
      col(20, [
        el.heading("Vantari", {
          level: "h1",
          fontSize: 22,
          fontWeight: "700",
          marginBottom: 0,
          letterSpacing: "-0.02em",
        }),
      ]),
      col(55, [
        el.link("Product", "#product", { marginRight: 28 }),
        el.link("Solutions", "#solutions", { marginRight: 28 }),
        el.link("Customers", "#customers", { marginRight: 28 }),
        el.link("Pricing", "#pricing", { marginRight: 28 }),
        el.link("Docs", "#docs", { marginRight: 0 }),
      ], { textAlign: "center" }),
      col(25, [
        el.link("Sign in", "/login", {
          marginRight: 16,
          color: theme.textMuted,
        }),
        el.button("Start free trial", "/signup", {
          backgroundColor: gradients.indigoViolet,
          color: theme.onBand,
          size: "md",
          fontSize: 14,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 22,
          paddingRight: 22,
          marginRight: 0,
          marginTop: 0,
          boxShadowY: 8,
          boxShadowBlur: 20,
          boxShadowColor: "rgba(31,113,235,0.4)",
        }),
      ], { textAlign: "right" }),
    ]),
  ],
  {
    name: "Sticky CTA Header",
    description: "Full-width header with logo, nav, and a strong gradient CTA",
    category: "header",
    slug: "header-sticky-cta",
    type: "fullwidth",
    settings: {
      ...sectionPresets.bar,
      backgroundColor: theme.glass,
      borderBottom: true,
      borderColor: theme.border,
      borderWidth: 1,
      borderStyle: "solid",
      position: "sticky",
      top: "0",
      zIndex: "50",
    },
  }
);
