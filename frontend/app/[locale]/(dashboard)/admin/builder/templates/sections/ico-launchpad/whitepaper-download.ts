import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

export const icoLaunchpadWhitepaperDownload: Section = section(
  [
    row(
      [
        col(
          45,
          [
            el.text("WHITEPAPER v3.2", {
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: "0.18em",
              color: theme.onBandDim,
              marginBottom: 16,
            }),
            el.heading("Orbit Compute", {
              level: "h3",
              fontSize: 28,
              fontWeight: "800",
              letterSpacing: "-0.02em",
              color: theme.onBand,
              marginBottom: 8,
            }),
            el.text("Permissionless GPU infrastructure", {
              fontSize: 14,
              color: theme.onBandMuted,
              marginBottom: 32,
            }),
            el.divider({
              marginTop: 0,
              marginBottom: 28,
              borderColor: theme.onBandBorder,
            }),
            el.text("SECTIONS · 42", {
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: "0.16em",
              color: theme.onBandMuted,
              marginBottom: 10,
            }),
            el.text("PAGES · 68", {
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: "0.16em",
              color: theme.onBandMuted,
              marginBottom: 10,
            }),
            el.text("LAST UPDATED · Apr 14, 2026", {
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: "0.16em",
              color: theme.onBandMuted,
              marginBottom: 0,
            }),
          ],
          {
            backgroundColor: "#0f172a",
            borderRadius: 20,
            paddingTop: 56,
            paddingBottom: 56,
            paddingLeft: 40,
            paddingRight: 40,
            boxShadowX: 0,
            boxShadowY: 24,
            boxShadowBlur: 48,
            boxShadowColor: "rgba(10,18,32,0.2)",
          }
        ),
        col(55, [
          el.text("WHITEPAPER", {
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: "0.18em",
            color: theme.primary,
            marginBottom: 12,
          }),
          el.heading("Read the full technical thesis", {
            fontSize: 44,
            fontWeight: "800",
            letterSpacing: "-0.025em",
            lineHeight: "1.1",
            color: theme.text,
            marginBottom: 20,
          }),
          el.text(
            "Everything from our consensus design and slashing conditions to the GPU matcher, token flows, and audit trail — in one 68-page document.",
            {
              fontSize: 17,
              lineHeight: "1.65",
              color: theme.textMuted,
              marginBottom: 28,
              maxWidth: "480px",
            }
          ),
          el.list(
            [
              "Architecture & consensus",
              "Token economics in depth",
              "Governance and upgrade paths",
              "Security audits and risk analysis",
            ],
            {
              fontSize: 15,
              lineHeight: "1.9",
              color: theme.text,
              marginBottom: 36,
            }
          ),
          el.button("Download whitepaper (PDF)", "/launchpad/orbit-compute/whitepaper.pdf", {
            fontSize: 16,
          }),
          el.button("View online", "/launchpad/orbit-compute/whitepaper", {
            backgroundColor: "transparent",
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            fontSize: 16,
          }),
        ]),
      ],
      { ...rowPresets.wide, gutter: 56, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Whitepaper Download",
    description: "Whitepaper preview card with download CTA and key sections",
    category: "ico-launchpad",
    slug: "ico-launchpad-whitepaper-download",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
