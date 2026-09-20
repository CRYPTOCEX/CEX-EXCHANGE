import type { Section, Element, Column, Row } from "@/types/builder";
import { generateId } from "@/store/builder-store";
import {
  el,
  row,
  col,
  section,
  theme,
  gradients,
  sectionPresets,
  rowPresets,
} from "../../utils";

const colR = (
  width: number,
  elements: Element[],
  rows: Row[],
  settings: Record<string, unknown> = {}
): Column => ({
  id: generateId("column"),
  width,
  elements,
  rows,
  settings: { paddingTop: 0, paddingBottom: 0, paddingLeft: 12, paddingRight: 12, ...settings },
  nestingLevel: 1,
});

const benefit = (icon: string, title: string, body: string): Element[] => [
  el.icon(icon, {
    size: 24,
    color: theme.onBand,
    marginBottom: 12,
  }),
  el.heading(title, {
    level: "h4",
    fontSize: 16,
    fontWeight: "700",
    color: theme.onBand,
    marginBottom: 6,
    letterSpacing: "-0.005em",
  }),
  el.text(body, {
    fontSize: 13,
    lineHeight: "1.6",
    color: theme.onBandMuted,
    marginBottom: 0,
  }),
];

const benefitCardSettings = {
  backgroundColor: theme.onBandFill,
  borderColor: theme.onBandBorder,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 14,
  padding: 20,
};

export const nftCreatorOnboardingCta: Section = section(
  [
    row(
      [
        col(55, [
          el.text("FOR ARTISTS", {
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: "0.18em",
            color: theme.onBand,
            backgroundColor: theme.onBandFill,
            borderRadius: 999,
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: 16,
            paddingRight: 16,
            marginBottom: 24,
            maxWidth: "160px",
          }),
          el.heading("Become a creator. Keep 95%.", {
            level: "h2",
            fontSize: 52,
            fontWeight: "800",
            letterSpacing: "-0.03em",
            lineHeight: "1.05",
            color: theme.onBand,
            marginBottom: 20,
          }),
          el.text(
            "Launch a collection in minutes. We handle the smart contracts, payouts, and royalty enforcement — you keep shipping work.",
            {
              fontSize: 18,
              lineHeight: "1.65",
              color: theme.onBandMuted,
              marginBottom: 36,
              maxWidth: "520px",
            }
          ),
          el.button("Apply to create", "/nft/creator/apply", {
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            fontSize: 16,
          }),
          el.button("Read creator docs", "/docs/nft-creators", {
            backgroundColor: theme.onBandFill,
            color: theme.onBand,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.onBandBorder,
            fontSize: 16,
          }),
        ]),
        colR(45, [], [
          row(
            [
              col(
                50,
                benefit(
                  "lucide:coins",
                  "95% revenue",
                  "Platform fee is 2.5% on primary, 2.5% on secondary — royalties forever."
                ),
                benefitCardSettings
              ),
              col(
                50,
                benefit(
                  "lucide:zap",
                  "Gasless mint",
                  "We cover gas for your first 1,000 collectors. Smooth onboarding built in."
                ),
                benefitCardSettings
              ),
            ],
            { gutter: 16, marginBottom: 16, verticalAlign: "top", maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
          ),
          row(
            [
              col(
                50,
                benefit(
                  "lucide:shield-check",
                  "Royalty enforcement",
                  "On-chain royalty hooks across Ethereum and Base. No leakage to aggregators."
                ),
                benefitCardSettings
              ),
              col(
                50,
                benefit(
                  "lucide:bar-chart-3",
                  "Live analytics",
                  "Sales, owners, floor trends, and fan retention — updated in real time."
                ),
                benefitCardSettings
              ),
            ],
            { gutter: 16, verticalAlign: "top", maxWidth: "100%", paddingLeft: 0, paddingRight: 0 }
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 56, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Creator Onboarding CTA",
    description: "Become a creator CTA with four platform benefits",
    category: "nft",
    slug: "nft-creator-onboarding-cta",
    type: "fullwidth",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: gradients.indigoViolet,
    },
  }
);
