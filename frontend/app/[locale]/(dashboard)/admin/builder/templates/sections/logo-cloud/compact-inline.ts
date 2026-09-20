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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="36" viewBox="0 0 130 36"><rect x="4" y="8" width="18" height="20" rx="4" fill="#71717a"/><text x="28" y="24" font-family="system-ui,-apple-system,sans-serif" font-size="15" font-weight="700" fill="#52525b">${name}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const logoCell = (name: string) =>
  col(
    16.66,
    [
      el.image(logoSvg(name), `${name} logo`, {
        width: "110px",
        height: "auto",
        grayscale: 100,
        opacity: 0.7,
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: 0,
      }),
    ],
    { textAlign: "center", paddingTop: 8, paddingBottom: 8 }
  );

export const logoCloudCompactInline: Section = section(
  [
    row(
      [
        logoCell("Meridian"),
        logoCell("Axiom"),
        logoCell("Helios"),
        logoCell("Nebula"),
        logoCell("Flux"),
        logoCell("Orbit"),
      ],
      { ...rowPresets.wide, gutter: 16, verticalAlign: "middle" }
    ),
    singleColumnRow([
      el.text("And 5,000+ other teams moving fast", {
        fontSize: 13,
        textAlign: "center",
        color: theme.textDim,
        marginTop: 24,
        marginBottom: 0,
        letterSpacing: "0.02em",
      }),
    ]),
  ],
  {
    name: "Compact Inline Logos",
    description: "Single row of six logos with a supporting caption — minimal footprint",
    category: "logo-cloud",
    slug: "logo-cloud-compact-inline",
    settings: {
      ...sectionPresets.compact,
      backgroundColor: theme.bgBase,
    },
  }
);
