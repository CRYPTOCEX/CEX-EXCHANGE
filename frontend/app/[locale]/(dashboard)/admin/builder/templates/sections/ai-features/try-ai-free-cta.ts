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

const perk = (label: string) =>
  col(100, [
    el.text(`✓  ${label}`, {
      fontSize: 15,
      fontWeight: "500",
      color: theme.onBandMuted,
      marginBottom: 0,
      textAlign: "center",
    }),
  ]);

export const aiFeaturesTryAiFreeCta: Section = section(
  [
    singleColumnRow([
      el.text("LIMITED-TIME OFFER", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.onBand,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 20,
      }),
      el.heading("Try Mash AI free for 14 days", {
        level: "h2",
        fontSize: 72,
        fontWeight: "800",
        textAlign: "center",
        color: theme.onBand,
        letterSpacing: "-0.035em",
        lineHeight: "1.02",
        marginBottom: 24,
        maxWidth: "960px",
      }),
      el.text(
        "Full access to every signal, every strategy tool, and the AI assistant. No credit card required. Cancel anytime.",
        {
          fontSize: 20,
          textAlign: "center",
          color: theme.onBandMuted,
          maxWidth: "700px",
          marginBottom: 48,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        perk("No credit card required"),
        perk("Full access to every feature"),
        perk("Cancel with one click"),
        perk("Keep your data if you leave"),
      ],
      {
        ...rowPresets.wide,
        maxWidth: "1000px",
        gutter: 16,
        marginBottom: 48,
        verticalAlign: "middle",
      }
    ),
    singleColumnRow(
      [
        el.button("Start your 14-day free trial", "/ai/trial", {
          backgroundColor: theme.onBandSurface,
          color: theme.onBandSurfaceInk,
          fontSize: 17,
          paddingLeft: 44,
          paddingRight: 44,
          paddingTop: 18,
          paddingBottom: 18,
          marginRight: 12,
        }),
        el.button("Talk to sales", "/ai/contact-sales", {
          backgroundColor: theme.onBandFill,
          color: theme.onBand,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.onBandBorder,
          fontSize: 17,
          paddingLeft: 32,
          paddingRight: 32,
          paddingTop: 18,
          paddingBottom: 18,
          marginRight: 0,
        }),
      ],
      { textAlign: "center" }
    ),
    singleColumnRow(
      [
        el.text("Joined 184,000+ traders using Mash AI this month", {
          fontSize: 13,
          color: theme.onBandDim,
          textAlign: "center",
          marginTop: 28,
          marginBottom: 0,
          letterSpacing: "0.04em",
        }),
      ]
    ),
  ],
  {
    name: "Try AI Free CTA",
    description: "Dark trial CTA with perks row and sales fallback",
    category: "ai-features",
    slug: "ai-features-try-ai-free-cta",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: {
        type: "gradient",
        gradient: {
          direction: "to-br",
          from: "#020617",
          via: "#1e1b4b",
          to: "#3b0764",
          light: { direction: "to-br", from: "#0f172a", via: "#4338ca", to: "#6d28d9" },
          dark: { direction: "to-br", from: "#020617", via: "#1e1b4b", to: "#3b0764" },
        },
      } as any,
    },
  }
);
