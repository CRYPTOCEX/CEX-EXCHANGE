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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="44" viewBox="0 0 150 44"><rect x="8" y="12" width="20" height="20" rx="5" fill="#52525b"/><text x="34" y="30" font-family="system-ui,-apple-system,sans-serif" font-size="17" font-weight="700" fill="#52525b">${name}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const logoCell = (name: string) =>
  col(
    33.33,
    [
      el.image(logoSvg(name), `${name} logo`, {
        width: "130px",
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

export const logoCloudSplitWithHeading: Section = section(
  [
    row(
      [
        col(40, [
          el.text("OUR CUSTOMERS", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.primary,
            letterSpacing: "0.22em",
            marginBottom: 16,
          }),
          el.heading("Trusted by teams you already know", {
            level: "h2",
            fontSize: 36,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 16,
            letterSpacing: "-0.02em",
            lineHeight: "1.15",
          }),
          el.text(
            "From bootstrapped startups to public companies, 5,000+ teams ship faster with our platform.",
            {
              fontSize: 16,
              lineHeight: "1.65",
              color: theme.textMuted,
              marginBottom: 0,
            }
          ),
        ]),
        {
          ...col(60, []),
          rows: [
            row(
              [logoCell("Meridian"), logoCell("Axiom"), logoCell("Helios")],
              { gutter: 16, maxWidth: "100%", verticalAlign: "middle" }
            ),
            row(
              [logoCell("Nebula"), logoCell("Flux"), logoCell("Orbit")],
              { gutter: 16, maxWidth: "100%", verticalAlign: "middle" }
            ),
          ],
        },
      ],
      { ...rowPresets.wide, gutter: 64, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Split with Heading",
    description: "Trusted-by headline on the left, six-logo grid on the right",
    category: "logo-cloud",
    slug: "logo-cloud-split-with-heading",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
