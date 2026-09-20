import type { Section } from "@/types/builder";
import { el, row, col, section, theme, sectionPresets } from "../../utils";

export const headerSaasWithAuth: Section = section(
  [
    row([
      col(20, [
        el.heading("Kora", {
          level: "h1",
          fontSize: 22,
          fontWeight: "700",
          marginBottom: 0,
          letterSpacing: "-0.02em",
        }),
      ]),
      col(50, [
        el.link("Features", "#features", { marginRight: 28 }),
        el.link("Integrations", "#integrations", { marginRight: 28 }),
        el.link("Pricing", "#pricing", { marginRight: 28 }),
        el.link("Changelog", "#changelog", { marginRight: 0 }),
      ], { textAlign: "center" }),
      col(30, [
        el.icon("lucide:search", {
          size: 20,
          color: theme.textMuted,
          marginBottom: 0,
          marginRight: 20,
          display: "inline-block",
        }),
        el.link("Log in", "/login", {
          marginRight: 16,
          color: theme.textMuted,
        }),
        el.button("Sign up free", "/signup", {
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
    name: "SaaS With Auth Header",
    description: "Logo, nav, search icon, login link, and a signup button",
    category: "header",
    slug: "header-saas-with-auth",
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
