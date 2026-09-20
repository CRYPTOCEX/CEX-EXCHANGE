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

const trustStat = (value: string, label: string) =>
  col(100, [
    el.heading(value, {
      level: "h3",
      fontSize: 48,
      fontWeight: "800",
      // Pinned ink: the section ground is a deliberate dark band, so a
      // theme-following accent would go dark-on-dark in light mode.
      color: theme.onBand,
      textAlign: "center",
      letterSpacing: "-0.03em",
      lineHeight: "1",
      marginBottom: 10,
    }),
    el.text(label, {
      fontSize: 14,
      color: theme.onBandDim,
      textAlign: "center",
      fontWeight: "500",
      marginBottom: 0,
      lineHeight: "1.5",
    }),
  ]);

export const aiFeaturesFraudDetectionTrust: Section = section(
  [
    singleColumnRow([
      el.text("MASH AI · FRAUD SHIELD", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.onBandMuted,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 20,
      }),
      el.heading("AI-powered fraud detection protects every trade", {
        level: "h2",
        fontSize: 56,
        fontWeight: "800",
        textAlign: "center",
        color: theme.onBand,
        letterSpacing: "-0.03em",
        lineHeight: "1.05",
        marginBottom: 20,
        maxWidth: "920px",
      }),
      el.text(
        "Every order, payment, and withdrawal passes through a 240-feature fraud model trained on 14 years of labeled activity. Suspicious patterns are frozen automatically — before money moves.",
        {
          fontSize: 19,
          textAlign: "center",
          color: theme.onBandMuted,
          maxWidth: "720px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        trustStat("99.98%", "Legitimate trades approved without friction"),
        trustStat("$142M", "Blocked fraudulent transactions last year"),
        trustStat("< 80ms", "Average fraud scoring latency per request"),
        trustStat("240", "Behavioral signals per risk decision"),
      ],
      { ...rowPresets.wide, gutter: 32, marginBottom: 56, verticalAlign: "top" }
    ),
    singleColumnRow(
      [
        el.button("Read the security whitepaper", "/security/whitepaper", {
          backgroundColor: theme.onBandSurface,
          color: theme.onBandSurfaceInk,
          fontSize: 15,
          paddingLeft: 28,
          paddingRight: 28,
          marginRight: 12,
        }),
        el.button("See fraud shield in action", "/security/demo", {
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
    name: "Fraud Detection Trust",
    description: "Dark trust section highlighting AI fraud detection stats",
    category: "ai-features",
    slug: "ai-features-fraud-detection-trust",
    type: "fullwidth",
    settings: {
      ...sectionPresets.hero,
      backgroundColor: {
        type: "gradient",
        gradient: {
          direction: "to-br",
          from: "#022c22",
          via: "#064e3b",
          to: "#0f172a",
          light: { direction: "to-br", from: "#064e3b", via: "#065f46", to: "#0f172a" },
          dark: { direction: "to-br", from: "#020617", via: "#022c22", to: "#064e3b" },
        },
      } as any,
    },
  }
);
