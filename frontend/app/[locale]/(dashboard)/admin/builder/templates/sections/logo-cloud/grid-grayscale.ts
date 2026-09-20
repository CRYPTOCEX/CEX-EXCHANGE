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

const logoSvg = (name: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><rect x="8" y="14" width="20" height="20" rx="4" fill="#a1a1aa"/><text x="36" y="32" font-family="system-ui,-apple-system,sans-serif" font-size="18" font-weight="700" fill="#52525b">${name}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const LOGOS = ["Meridian", "Axiom", "Helios", "Nebula", "Flux", "Orbit", "Arcade", "Forma", "Meridian", "Axiom"];

const logoCell = (name: string) =>
  col(
    20,
    [
      el.image(logoSvg(name), `${name} logo`, {
        width: "140px",
        height: "auto",
        grayscale: 100,
        opacity: 0.7,
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: 0,
      }),
    ],
    { textAlign: "center", paddingTop: 24, paddingBottom: 24 }
  );

export const logoCloudGridGrayscale: Section = section(
  [
    singleColumnRow([
      el.text("TRUSTED BY LEADERS", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.22em",
        marginBottom: 12,
        textAlign: "center",
      }),
      el.heading("Built for the teams that set the pace", {
        level: "h2",
        fontSize: 36,
        fontWeight: "700",
        textAlign: "center",
        color: theme.text,
        marginBottom: 48,
        letterSpacing: "-0.02em",
        maxWidth: "720px",
      }),
    ]),
    row(
      [logoCell(LOGOS[0]), logoCell(LOGOS[1]), logoCell(LOGOS[2]), logoCell(LOGOS[3]), logoCell(LOGOS[4])],
      { ...rowPresets.wide, gutter: 24 }
    ),
    row(
      [logoCell(LOGOS[5]), logoCell(LOGOS[6]), logoCell(LOGOS[7]), logoCell(LOGOS[0]), logoCell(LOGOS[3])],
      { ...rowPresets.wide, gutter: 24 }
    ),
  ],
  {
    name: "Grayscale Logo Grid",
    description: "Two rows of five grayscale customer logos centered on a clean background",
    category: "logo-cloud",
    slug: "logo-cloud-grid-grayscale",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
