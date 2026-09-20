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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><rect x="8" y="14" width="22" height="22" rx="5" fill="#52525b"/><text x="36" y="32" font-family="system-ui,-apple-system,sans-serif" font-size="18" font-weight="700" fill="#52525b">${name}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const stackedLogo = (name: string) =>
  el.image(logoSvg(name), `${name} logo`, {
    width: "150px",
    height: "auto",
    grayscale: 100,
    opacity: 0.8,
    marginTop: 14,
    marginBottom: 14,
    marginLeft: "auto",
    marginRight: "auto",
  });

export const logoCloudVerticalColumn: Section = section(
  [
    row(
      [
        col(50, [
          el.text("OUR CUSTOMERS", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.primary,
            letterSpacing: "0.22em",
            marginBottom: 16,
          }),
          el.heading("A short list of the teams we're proud to serve", {
            level: "h2",
            fontSize: 36,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 16,
            letterSpacing: "-0.02em",
            lineHeight: "1.15",
          }),
          el.text(
            "Hand-picked partners across finance, commerce, and infrastructure — the teams setting the bar in their market.",
            {
              fontSize: 16,
              lineHeight: "1.7",
              color: theme.textMuted,
              marginBottom: 24,
            }
          ),
          el.link("See all customers →", "/customers", {
            fontSize: 15,
            fontWeight: "600",
            color: theme.primary,
          }),
        ]),
        col(
          50,
          [
            stackedLogo("Meridian"),
            el.divider({ marginTop: 8, marginBottom: 8 }),
            stackedLogo("Axiom"),
            el.divider({ marginTop: 8, marginBottom: 8 }),
            stackedLogo("Helios"),
            el.divider({ marginTop: 8, marginBottom: 8 }),
            stackedLogo("Nebula"),
            el.divider({ marginTop: 8, marginBottom: 8 }),
            stackedLogo("Flux"),
          ],
          { textAlign: "center" }
        ),
      ],
      { ...rowPresets.contained, gutter: 64, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Vertical Column Logos",
    description: "Narrow vertical stack of five logos paired with a short intro",
    category: "logo-cloud",
    slug: "logo-cloud-vertical-column",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
