import type { Section } from "@/types/builder";
import { el, row, col, section, theme, sectionPresets } from "../../utils";

export const headerCenteredLogo: Section = section(
  [
    row([
      col(35, [
        el.link("Shop", "#shop", { marginRight: 24 }),
        el.link("Collections", "#collections", { marginRight: 24 }),
        el.link("Journal", "#journal", { marginRight: 0 }),
      ], { textAlign: "left" }),
      col(30, [
        el.heading("Axiom", {
          level: "h1",
          fontSize: 26,
          fontWeight: "700",
          marginBottom: 0,
          letterSpacing: "-0.02em",
          textAlign: "center",
        }),
      ], { textAlign: "center" }),
      col(35, [
        el.link("About", "#about", { marginRight: 24 }),
        el.link("Contact", "#contact", { marginRight: 24 }),
        el.link("Account", "/account", { marginRight: 0 }),
      ], { textAlign: "right" }),
    ]),
  ],
  {
    name: "Centered Logo Header",
    description: "Logo centered with navigation split left and right",
    category: "header",
    slug: "header-centered-logo",
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
