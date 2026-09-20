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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="40" viewBox="0 0 130 40"><rect x="4" y="10" width="18" height="20" rx="4" fill="#71717a"/><text x="28" y="27" font-family="system-ui,-apple-system,sans-serif" font-size="15" font-weight="700" fill="#52525b">${name}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const logoCell = (name: string) =>
  col(
    33.33,
    [
      el.image(logoSvg(name), `${name} logo`, {
        width: "110px",
        height: "auto",
        grayscale: 100,
        opacity: 0.75,
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: 0,
      }),
    ],
    { textAlign: "center", paddingTop: 18, paddingBottom: 18 }
  );

const categoryLabel = (text: string) =>
  singleColumnRow([
    el.text(text, {
      fontSize: 11,
      fontWeight: "700",
      color: theme.primary,
      letterSpacing: "0.22em",
      marginBottom: 16,
      marginTop: 32,
      textAlign: "center",
    }),
  ]);

export const logoCloudCategorizedGroups: Section = section(
  [
    singleColumnRow([
      el.heading("Customers across every industry", {
        level: "h2",
        fontSize: 38,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 14,
        letterSpacing: "-0.03em",
      }),
      el.text(
        "From trading floors to fintech startups — we power workflows wherever speed and precision matter.",
        {
          fontSize: 16,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "560px",
          marginBottom: 24,
          lineHeight: "1.6",
        }
      ),
    ]),
    categoryLabel("FINANCE"),
    row(
      [logoCell("Meridian"), logoCell("Axiom"), logoCell("Helios")],
      { ...rowPresets.contained, gutter: 16 }
    ),
    categoryLabel("TECHNOLOGY"),
    row(
      [logoCell("Nebula"), logoCell("Flux"), logoCell("Orbit")],
      { ...rowPresets.contained, gutter: 16 }
    ),
    categoryLabel("E-COMMERCE"),
    row(
      [logoCell("Arcade"), logoCell("Forma"), logoCell("Meridian")],
      { ...rowPresets.contained, gutter: 16 }
    ),
  ],
  {
    name: "Categorized Groups",
    description: "Logo grid organized by vertical with category labels above each row",
    category: "logo-cloud",
    slug: "logo-cloud-categorized-groups",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
