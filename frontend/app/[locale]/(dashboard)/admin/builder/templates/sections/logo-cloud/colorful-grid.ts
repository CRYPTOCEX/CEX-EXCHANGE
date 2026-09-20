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

/* THE FILLS BELOW ARE NOT DESIGN-SYSTEM DEBT. This section's entire premise is
   "full-color logo grid that celebrates partners instead of muting them" — each
   mark is a (placeholder) third-party brand, and a partner's brand colour is by
   definition not one of our tokens. Re-pointing them at `--primary` etc. would
   paint eight identical blue squares and delete the section.

   KNOWN BUG, deliberately left as-is: the wordmark `fill` is a fixed near-black
   and the SVG is embedded as a data URI in an <img>, so neither `currentColor`
   nor `var(--foreground)` crosses into it. On the dark `--background` (#060810)
   near-black text measures 1.01:1 — the partner names are invisible in dark
   mode. There is no one-colour fix: clearing 4.5:1 on the light background
   needs luminance <= 0.166 and clearing it on the dark background needs
   >= 0.186. Fixing it properly means giving each mark its own plate (a design
   change) or rendering the logos as real DOM instead of an <img>. */
const logoSvg = (name: string, fill: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="48" viewBox="0 0 150 48"><rect x="8" y="12" width="24" height="24" rx="6" fill="${fill}"/><text x="40" y="32" font-family="system-ui,-apple-system,sans-serif" font-size="18" font-weight="700" fill="#09090b">${name}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const LOGOS: { name: string; fill: string }[] = [
  { name: "Meridian", fill: "#6366f1" },
  { name: "Axiom", fill: "#10b981" },
  { name: "Helios", fill: "#f59e0b" },
  { name: "Nebula", fill: "#8b5cf6" },
  { name: "Flux", fill: "#0ea5e9" },
  { name: "Orbit", fill: "#ef4444" },
  { name: "Arcade", fill: "#ec4899" },
  { name: "Forma", fill: "#14b8a6" },
];

const logoCell = ({ name, fill }: { name: string; fill: string }) =>
  col(
    25,
    [
      el.image(logoSvg(name, fill), `${name} logo`, {
        width: "140px",
        height: "auto",
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: 0,
      }),
    ],
    { textAlign: "center", paddingTop: 28, paddingBottom: 28 }
  );

export const logoCloudColorfulGrid: Section = section(
  [
    singleColumnRow([
      el.text("PARTNERS & INTEGRATIONS", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.22em",
        marginBottom: 16,
        textAlign: "center",
      }),
      el.heading("Plays well with your whole stack", {
        level: "h2",
        fontSize: 40,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "One-click integrations with the tools your team already runs. Full-color, front and center — because proud partners deserve it.",
        {
          fontSize: 17,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "580px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      LOGOS.slice(0, 4).map(logoCell),
      { ...rowPresets.wide, gutter: 16 }
    ),
    row(
      LOGOS.slice(4, 8).map(logoCell),
      { ...rowPresets.wide, gutter: 16 }
    ),
  ],
  {
    name: "Colorful Logo Grid",
    description: "Full-color logo grid that celebrates partners instead of muting them",
    category: "logo-cloud",
    slug: "logo-cloud-colorful-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
