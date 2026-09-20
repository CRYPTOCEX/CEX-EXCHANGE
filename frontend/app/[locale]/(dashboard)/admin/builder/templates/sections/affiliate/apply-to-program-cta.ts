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

const criteria = (icon: string, label: string) =>
  col(
    100,
    [
      el.icon(icon, {
        size: 22,
        color: theme.onBand,
        marginBottom: 12,
      }),
      el.text(label, {
        fontSize: 14,
        color: theme.onBandMuted,
        fontWeight: "500",
        lineHeight: "1.5",
        marginBottom: 0,
      }),
    ],
    {
      backgroundColor: theme.onBandFill,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.onBandFill,
      borderRadius: 14,
      paddingTop: 22,
      paddingBottom: 22,
      paddingLeft: 20,
      paddingRight: 20,
    }
  );

export const affiliateApplyToProgramCta: Section = section(
  [
    singleColumnRow([
      el.text("APPLY NOW · 24-HOUR REVIEW", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.onBand,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 18,
      }),
      el.heading("Turn your audience into recurring income", {
        level: "h2",
        fontSize: 56,
        fontWeight: "800",
        textAlign: "center",
        color: theme.onBand,
        letterSpacing: "-0.03em",
        lineHeight: "1.05",
        marginBottom: 20,
        maxWidth: "860px",
      }),
      el.text(
        "Applications take 3 minutes. We review every one by hand — no auto-rejects, no hoops.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.onBandMuted,
          maxWidth: "680px",
          marginBottom: 48,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        criteria("lucide:megaphone", "An audience of 1,000+ engaged followers on any channel"),
        criteria("lucide:book-open", "A newsletter, blog, podcast, or video channel focused on crypto, finance, or tech"),
        criteria("lucide:shield-check", "Willingness to follow FTC / MAS / FCA disclosure requirements"),
        criteria("lucide:globe-2", "Residency in one of 180+ supported countries"),
      ],
      { ...rowPresets.wide, gutter: 18, marginBottom: 48, verticalAlign: "top" }
    ),
    singleColumnRow(
      [
        el.button("Start your application", "/affiliate/apply", {
          backgroundColor: theme.onBandSurface,
          color: theme.onBandSurfaceInk,
          fontSize: 16,
          paddingLeft: 40,
          paddingRight: 40,
          marginRight: 12,
        }),
        el.button("Talk to the creator team", "/affiliate/contact", {
          backgroundColor: theme.onBandFill,
          color: theme.onBand,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.onBandBorder,
          marginRight: 0,
        }),
      ],
      { textAlign: "center" }
    ),
  ],
  {
    name: "Apply to Program CTA",
    description: "Final application CTA with qualifying criteria and dual actions",
    category: "affiliate",
    slug: "affiliate-apply-to-program-cta",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: {
        type: "gradient",
        gradient: {
          direction: "to-br",
          from: "#1e1b4b",
          via: "#312e81",
          to: "#0f172a",
          light: { direction: "to-br", from: "#312e81", via: "#4338ca", to: "#1e1b4b" },
          dark: { direction: "to-br", from: "#020617", via: "#1e1b4b", to: "#312e81" },
        },
      } as any,
    },
  }
);
