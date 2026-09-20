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

const logoSvg = (name: string, color = "#71717a") => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="40" viewBox="0 0 140 40"><rect x="6" y="10" width="20" height="20" rx="5" fill="${color}"/><text x="32" y="27" font-family="system-ui,-apple-system,sans-serif" font-size="17" font-weight="700" fill="${color}">${name}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const LOGOS = ["Meridian", "Axiom", "Helios", "Nebula", "Flux", "Orbit", "Arcade", "Forma"];

const marqueeLogo = (name: string) =>
  col(
    12.5,
    [
      el.image(logoSvg(name), `${name} logo`, {
        width: "120px",
        height: "auto",
        opacity: 0.8,
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: 0,
      }),
    ],
    { textAlign: "center", paddingTop: 16, paddingBottom: 16 }
  );

export const logoCloudScrollingMarquee: Section = section(
  [
    singleColumnRow([
      el.text("POWERING TEAMS AT", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.22em",
        marginBottom: 32,
        textAlign: "center",
      }),
    ]),
    row(
      LOGOS.map((name) => marqueeLogo(name)),
      {
        ...rowPresets.wide,
        gutter: 16,
        backgroundColor: theme.bgSubtle,
        borderColor: theme.border,
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: 16,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
      }
    ),
    singleColumnRow([
      el.text("Scrolls infinitely in production", {
        fontSize: 13,
        textAlign: "center",
        color: theme.textDim,
        marginTop: 20,
        marginBottom: 0,
      }),
    ]),
  ],
  {
    name: "Scrolling Marquee Logos",
    description: "Horizontal strip of eight logos designed to auto-scroll on the live page",
    category: "logo-cloud",
    slug: "logo-cloud-scrolling-marquee",
    settings: {
      ...sectionPresets.compact,
      backgroundColor: theme.bgBase,
    },
  }
);
