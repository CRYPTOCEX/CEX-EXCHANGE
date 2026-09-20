import type { Section } from "@/types/builder";
import { el, row, col, section, theme } from "../../utils";

export const footerCompactLinks: Section = section(
  [
    row([
      col(20, [
        el.heading("Kora", {
          level: "h3",
          fontSize: 20,
          fontWeight: "700",
          marginBottom: 0,
          letterSpacing: "-0.02em",
        }),
      ]),
      col(55, [
        el.link("Product", "#product", {
          marginRight: 24,
          fontSize: 14,
          color: theme.textMuted,
        }),
        el.link("Pricing", "#pricing", {
          marginRight: 24,
          fontSize: 14,
          color: theme.textMuted,
        }),
        el.link("Docs", "#docs", {
          marginRight: 24,
          fontSize: 14,
          color: theme.textMuted,
        }),
        el.link("Blog", "#blog", {
          marginRight: 24,
          fontSize: 14,
          color: theme.textMuted,
        }),
        el.link("Contact", "#contact", {
          marginRight: 0,
          fontSize: 14,
          color: theme.textMuted,
        }),
      ], { textAlign: "center" }),
      col(25, [
        el.text(`© ${new Date().getFullYear()} Kora, Inc.`, {
          fontSize: 14,
          color: theme.textDim,
          marginBottom: 0,
          textAlign: "right",
        }),
      ], { textAlign: "right" }),
    ]),
  ],
  {
    name: "Compact Links Footer",
    description: "Single horizontal line with logo, five links, and copyright — minimal height",
    category: "footer",
    slug: "footer-compact-links",
    settings: {
      paddingTop: 28,
      paddingBottom: 28,
      paddingLeft: 24,
      paddingRight: 24,
      backgroundColor: theme.bgBase,
      borderTop: true,
      borderColor: theme.border,
      borderWidth: 1,
      borderStyle: "solid",
    },
  }
);
