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

const materialTile = (
  icon: string,
  title: string,
  body: string,
  cta: string,
  accent: string
) =>
  col(
    100,
    [
      el.icon(icon, { size: 32, color: accent, marginBottom: 18 }),
      el.heading(title, {
        level: "h3",
        fontSize: 19,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 10,
      }),
      el.text(body, {
        fontSize: 14,
        color: theme.textMuted,
        lineHeight: "1.6",
        marginBottom: 16,
      }),
      el.link(cta, "#", {
        fontSize: 14,
        fontWeight: "600",
        color: accent,
      }),
    ],
    {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      borderRadius: 16,
      paddingTop: 28,
      paddingBottom: 28,
      paddingLeft: 26,
      paddingRight: 26,
    }
  );

export const affiliateMarketingMaterialsGrid: Section = section(
  [
    singleColumnRow([
      el.text("MARKETING KIT", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.violet,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("Everything you need to convert", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.025em",
        lineHeight: "1.1",
      }),
      el.text(
        "Copy-paste-ready assets, A/B-tested messaging, and brand-safe visuals. All free — refreshed every month.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        materialTile("lucide:image", "Display banners", "24 sizes, from 300×250 to 970×250. Light and dark variants included.", "Browse banners →", theme.primary),
        materialTile("lucide:video", "Video assets", "Short cuts and full commercials in 1080p, 4K, and vertical 9:16.", "Browse videos →", theme.rose),
        materialTile("lucide:mail", "Email templates", "6 pre-written sequences — onboarding, nurture, re-activation.", "Browse emails →", theme.sky),
      ],
      { ...rowPresets.wide, gutter: 24, marginBottom: 24 }
    ),
    row(
      [
        materialTile("lucide:layout", "Landing pages", "Pre-built lander templates you can deploy under your own domain.", "Browse landers →", theme.emerald),
        materialTile("lucide:instagram", "Social kit", "Instagram, TikTok, X templates in Figma + Canva formats.", "Browse social →", theme.violet),
        materialTile("lucide:file-text", "Whitepapers", "Deep-dive PDFs perfect for newsletter swaps and lead magnets.", "Browse papers →", theme.amber),
      ],
      { ...rowPresets.wide, gutter: 24 }
    ),
  ],
  {
    name: "Marketing Materials Grid",
    description: "6-tile grid of marketing assets available to affiliates",
    category: "affiliate",
    slug: "affiliate-marketing-materials-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
