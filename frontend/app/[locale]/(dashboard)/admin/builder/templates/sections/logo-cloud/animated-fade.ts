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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="48" viewBox="0 0 150 48"><rect x="8" y="14" width="20" height="20" rx="5" fill="#a1a1aa"/><text x="34" y="32" font-family="system-ui,-apple-system,sans-serif" font-size="18" font-weight="700" fill="#52525b">${name}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const fadingLogo = (name: string, delay: number) =>
  col(
    25,
    [
      el.image(logoSvg(name), `${name} logo`, {
        width: "130px",
        height: "auto",
        grayscale: 100,
        opacity: 0.7,
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: 0,
        animationType: "fade-in",
        animationDuration: 1200,
        animationDelay: delay,
        animationEasing: "ease-out",
      }),
    ],
    { textAlign: "center", paddingTop: 24, paddingBottom: 24 }
  );

export const logoCloudAnimatedFade: Section = section(
  [
    singleColumnRow([
      el.text("THE WALL OF LOGOS", {
        fontSize: 12,
        fontWeight: "700",
        color: theme.primary,
        letterSpacing: "0.22em",
        marginBottom: 14,
        textAlign: "center",
      }),
      el.heading("A quiet parade of brilliant teams", {
        level: "h2",
        fontSize: 36,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.02em",
      }),
      el.text(
        "Logos gently fade into view as they enter the viewport — never distracting, always polished.",
        {
          fontSize: 16,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "540px",
          marginBottom: 48,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        fadingLogo("Meridian", 0),
        fadingLogo("Axiom", 120),
        fadingLogo("Helios", 240),
        fadingLogo("Nebula", 360),
      ],
      { ...rowPresets.wide, gutter: 16 }
    ),
    row(
      [
        fadingLogo("Flux", 480),
        fadingLogo("Orbit", 600),
        fadingLogo("Arcade", 720),
        fadingLogo("Forma", 840),
      ],
      { ...rowPresets.wide, gutter: 16 }
    ),
  ],
  {
    name: "Animated Fade Logos",
    description: "Logo wall with staggered fade-in animation as each cell appears",
    category: "logo-cloud",
    slug: "logo-cloud-animated-fade",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
