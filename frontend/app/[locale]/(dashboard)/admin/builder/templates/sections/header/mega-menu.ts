import type { Section } from "@/types/builder";
import { el, row, col, section, theme, sectionPresets } from "../../utils";

export const headerMegaMenu: Section = section(
  [
    row([
      col(20, [
        el.heading("Numeris", {
          level: "h1",
          fontSize: 22,
          fontWeight: "700",
          marginBottom: 0,
          letterSpacing: "-0.02em",
        }),
      ]),
      col(55, [
        el.link("Products", "#products", {
          marginRight: 28,
          fontWeight: "600",
          color: theme.text,
          paddingTop: 6,
          paddingBottom: 6,
          paddingLeft: 12,
          paddingRight: 12,
          backgroundColor: theme.bgMuted,
          borderRadius: 8,
        }),
        el.link("Solutions", "#solutions", { marginRight: 28 }),
        el.link("Developers", "#developers", { marginRight: 28 }),
        el.link("Pricing", "#pricing", { marginRight: 28 }),
        el.link("Resources", "#resources", { marginRight: 0 }),
      ], { textAlign: "center" }),
      col(25, [
        el.link("Sign in", "/login", {
          marginRight: 16,
          color: theme.textMuted,
        }),
        el.button("Start free", "/signup", {
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
    name: "Mega Menu Header",
    description: "Logo + nav with a visually prominent Products item hinting at a mega menu",
    category: "header",
    slug: "header-mega-menu",
    settings: {
      ...sectionPresets.bar,
      backgroundColor: theme.bgBase,
      borderBottom: true,
      borderColor: theme.border,
      borderWidth: 1,
      borderStyle: "solid",
    },
  }
);
