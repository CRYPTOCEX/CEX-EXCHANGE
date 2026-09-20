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

export const heroMinimalTypography: Section = section(
  [
    singleColumnRow([
      el.text("— EST. 2026", {
        fontSize: 13,
        fontWeight: "600",
        color: theme.textMuted,
        letterSpacing: "0.2em",
        marginBottom: 64,
        textAlign: "center",
      }),
      el.heading("Design is the art of making things obvious.", {
        level: "h1",
        fontSize: 112,
        fontWeight: "700",
        textAlign: "center",
        color: theme.text,
        marginBottom: 48,
        letterSpacing: "-0.045em",
        lineHeight: "0.98",
        maxWidth: "1080px",
      }),
      el.text(
        "We build tools for people who care about craft — studios, founders, and individuals obsessed with the details.",
        {
          fontSize: 22,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "680px",
          marginBottom: 48,
          lineHeight: "1.55",
          fontWeight: "400",
        }
      ),
    ]),
    row(
      [
        col(100, [
          el.link("Read the manifesto", "/manifesto", {
            fontSize: 16,
            fontWeight: "600",
            color: theme.text,
            textDecoration: "underline",
            textUnderlineOffset: "4px",
          }),
        ], { textAlign: "center" }),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Minimal Typography Hero",
    description: "Text-only hero with massive display type and generous whitespace",
    category: "hero",
    slug: "hero-minimal-typography",
    settings: {
      ...sectionPresets.hero,
      paddingTop: 160,
      paddingBottom: 160,
      backgroundColor: theme.bgBase,
    },
  }
);
