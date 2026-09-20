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
    25,
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
    {
      textAlign: "center",
      paddingTop: 28,
      paddingBottom: 28,
      borderRight: true,
      borderColor: theme.border,
      borderWidth: 1,
      borderStyle: "solid",
    }
  );

export const logoCloudBorderedBox: Section = section(
  [
    singleColumnRow([
      el.heading("In use at 5,000+ companies", {
        level: "h2",
        fontSize: 34,
        fontWeight: "700",
        textAlign: "center",
        color: theme.text,
        marginBottom: 48,
        letterSpacing: "-0.02em",
      }),
    ]),
    row(
      [logoCell("Meridian"), logoCell("Axiom"), logoCell("Helios"), logoCell("Nebula")],
      {
        ...rowPresets.contained,
        gutter: 0,
        borderColor: theme.border,
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: 20,
        backgroundColor: theme.bgCard,
        overflow: "hidden",
      }
    ),
    row(
      [logoCell("Flux"), logoCell("Orbit"), logoCell("Arcade"), logoCell("Forma")],
      {
        ...rowPresets.contained,
        gutter: 0,
        borderColor: theme.border,
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: 20,
        backgroundColor: theme.bgCard,
        borderTop: false,
        marginTop: -1,
        overflow: "hidden",
      }
    ),
  ],
  {
    name: "Bordered Box Logos",
    description: "Logo grid wrapped in a single bordered container with cell dividers",
    category: "logo-cloud",
    slug: "logo-cloud-bordered-box",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
