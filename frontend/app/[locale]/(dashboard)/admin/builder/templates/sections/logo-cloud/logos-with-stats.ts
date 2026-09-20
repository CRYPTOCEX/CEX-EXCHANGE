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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="44" viewBox="0 0 140 44"><rect x="6" y="12" width="20" height="20" rx="5" fill="#52525b"/><text x="32" y="30" font-family="system-ui,-apple-system,sans-serif" font-size="17" font-weight="700" fill="#52525b">${name}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const logoCell = (name: string) =>
  col(
    16.66,
    [
      el.image(logoSvg(name), `${name} logo`, {
        width: "120px",
        height: "auto",
        grayscale: 100,
        opacity: 0.75,
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: 0,
      }),
    ],
    { textAlign: "center", paddingTop: 12, paddingBottom: 12 }
  );

const statCell = (value: string, label: string) =>
  col(
    33.33,
    [
      el.heading(value, {
        level: "h3",
        fontSize: 44,
        fontWeight: "800",
        color: theme.primary,
        marginBottom: 8,
        textAlign: "center",
        letterSpacing: "-0.02em",
      }),
      el.text(label, {
        fontSize: 14,
        fontWeight: "500",
        color: theme.textMuted,
        textAlign: "center",
        marginBottom: 0,
        letterSpacing: "0.02em",
      }),
    ]
  );

export const logoCloudLogosWithStats: Section = section(
  [
    singleColumnRow([
      el.text("TRUSTED BY 5,000+ COMPANIES", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.22em",
        marginBottom: 14,
        textAlign: "center",
      }),
      el.heading("Proof, in numbers and logos", {
        level: "h2",
        fontSize: 40,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 48,
        letterSpacing: "-0.03em",
      }),
    ]),
    row(
      [
        logoCell("Meridian"),
        logoCell("Axiom"),
        logoCell("Helios"),
        logoCell("Nebula"),
        logoCell("Flux"),
        logoCell("Orbit"),
      ],
      { ...rowPresets.wide, gutter: 16, marginBottom: 48 }
    ),
    row(
      [
        statCell("5,200+", "Companies onboarded"),
        statCell("$42B", "Volume processed in 2026"),
        statCell("24/7", "Market coverage"),
      ],
      {
        ...rowPresets.contained,
        gutter: 24,
        paddingTop: 40,
        borderTop: true,
        borderColor: theme.border,
        borderWidth: 1,
        borderStyle: "solid",
      }
    ),
  ],
  {
    name: "Logos with Stats",
    description: "Logo wall paired with a three-stat proof row below",
    category: "logo-cloud",
    slug: "logo-cloud-logos-with-stats",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
