import type { Section } from "@/types/builder";
import { el, row, col, section, theme, sectionPresets } from "../../utils";

export const headerBusinessStandard: Section = section(
  [
    row([
      col(25, [
        el.heading("Helios", {
          level: "h1",
          fontSize: 22,
          fontWeight: "700",
          marginBottom: 0,
          letterSpacing: "-0.02em",
        }),
      ]),
      col(50, [
        el.link("Products", "#products", { marginRight: 24 }),
        el.link("Solutions", "#solutions", { marginRight: 24 }),
        el.link("Pricing", "#pricing", { marginRight: 24 }),
        el.link("Docs", "#docs", { marginRight: 24 }),
        el.link("Company", "#company", { marginRight: 0 }),
      ], { textAlign: "center" }),
      col(25, [
        el.link("Sign in", "/login", {
          marginRight: 16,
          color: theme.textMuted,
        }),
        el.button("Get started", "/signup", {
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
    name: "Business Standard Header",
    description: "Logo left, navigation center, sign-in + primary CTA right",
    category: "header",
    slug: "header-business-standard",
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
