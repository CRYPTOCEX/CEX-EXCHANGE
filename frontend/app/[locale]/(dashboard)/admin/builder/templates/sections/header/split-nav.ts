import type { Section } from "@/types/builder";
import { el, row, col, section, theme, sectionPresets } from "../../utils";

export const headerSplitNav: Section = section(
  [
    row([
      col(20, [
        el.heading("Terracap", {
          level: "h1",
          fontSize: 22,
          fontWeight: "700",
          marginBottom: 0,
          letterSpacing: "-0.02em",
        }),
      ]),
      col(60, [
        el.link("Markets", "#markets", { marginRight: 28 }),
        el.link("Trade", "#trade", { marginRight: 28 }),
        el.link("Portfolio", "#portfolio", { marginRight: 28 }),
        el.link("Research", "#research", { marginRight: 28 }),
        el.link("Learn", "#learn", { marginRight: 0 }),
      ], { textAlign: "center" }),
      col(20, [
        el.icon("lucide:search", {
          size: 20,
          color: theme.textMuted,
          marginBottom: 0,
          marginRight: 16,
          display: "inline-block",
        }),
        el.icon("lucide:bell", {
          size: 20,
          color: theme.textMuted,
          marginBottom: 0,
          marginRight: 16,
          display: "inline-block",
        }),
        el.icon("lucide:user", {
          size: 20,
          color: theme.textMuted,
          marginBottom: 0,
          marginRight: 0,
          display: "inline-block",
        }),
      ], { textAlign: "right" }),
    ]),
  ],
  {
    name: "Split Nav Header",
    description: "Logo left, navigation centered, utility icons right",
    category: "header",
    slug: "header-split-nav",
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
