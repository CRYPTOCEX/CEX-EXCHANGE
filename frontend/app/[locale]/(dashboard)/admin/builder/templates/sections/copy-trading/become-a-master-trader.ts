import type { Section } from "@/types/builder";
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

export const copyTradingBecomeAMasterTrader: Section = section(
  [
    row(
      [
        col(52, [
          el.text("FOR PROFESSIONAL TRADERS", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.onBand,
            letterSpacing: "0.2em",
            marginBottom: 18,
          }),
          el.heading("Turn your edge into recurring income", {
            fontSize: 58,
            fontWeight: "800",
            color: theme.onBand,
            letterSpacing: "-0.03em",
            lineHeight: "1.05",
            marginBottom: 22,
          }),
          el.text(
            "Already trading profitably? Open a strategy provider account and let thousands of copiers pay you to keep doing what you do. Up to 25% of their profits land in your pocket every month.",
            {
              fontSize: 19,
              color: theme.onBandMuted,
              marginBottom: 32,
              lineHeight: "1.6",
              maxWidth: "560px",
            }
          ),
          el.list(
            [
              `<strong style="color:${theme.onBand};">Up to 25% profit share</strong> — paid out monthly, directly to your wallet`,
              `<strong style="color:${theme.onBand};">Verified-trader badge</strong> — get featured on the leaderboard and marketing`,
              `<strong style="color:${theme.onBand};">Dedicated analytics dashboard</strong> — Sharpe, Sortino, alpha, factor exposure`,
              `<strong style="color:${theme.onBand};">Flexible control</strong> — cap the number of copiers, pause onboarding any time`,
              `<strong style="color:${theme.onBand};">No minimum volume</strong> — start earning from your very first copier`,
              `<strong style="color:${theme.onBand};">Monthly payouts</strong> — with high-water-mark protection for you and copiers`,
            ],
            {
              fontSize: 16,
              color: theme.onBandMuted,
              lineHeight: "2",
              marginBottom: 36,
            }
          ),
          el.button("Apply as a strategy provider", "/become-a-trader", {
            backgroundColor: theme.onBandSurface,
            color: theme.onBandSurfaceInk,
            fontSize: 16,
            paddingLeft: 32,
            paddingRight: 32,
            marginRight: 12,
          }),
          el.button("See provider docs", "/docs/providers", {
            backgroundColor: theme.onBandFill,
            color: theme.onBand,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.onBandBorder,
            fontSize: 16,
          }),
        ]),
        col(48, [
          el.card(
            {
              backgroundColor: theme.onBandFill,
              borderColor: theme.onBandFill,
              borderWidth: 1,
              borderRadius: 24,
              padding: 40,
            },
            [
              el.text("TOP PROVIDER PAYOUT · LAST 30 DAYS", {
                fontSize: 11,
                fontWeight: "800",
                color: theme.onBandDim,
                letterSpacing: "0.18em",
                marginBottom: 20,
              }),
              el.heading("$184,284", {
                level: "h3",
                fontSize: 72,
                fontWeight: "800",
                color: theme.onBand,
                letterSpacing: "-0.04em",
                lineHeight: "1",
                marginBottom: 8,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }),
              el.text("earned in performance fees", {
                fontSize: 15,
                color: theme.onBandDim,
                marginBottom: 32,
              }),
              el.divider({ marginTop: 0, marginBottom: 28, borderColor: theme.onBandFill }),
              el.text(
                `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">
                  <div>
                    <div style="font-size:10px;font-weight:700;color:${theme.onBandDim};letter-spacing:0.14em;margin-bottom:6px;font-family:system-ui,sans-serif;">COPIERS</div>
                    <div style="font-size:24px;font-weight:800;color:${theme.onBand};">12,482</div>
                  </div>
                  <div>
                    <div style="font-size:10px;font-weight:700;color:${theme.onBandDim};letter-spacing:0.14em;margin-bottom:6px;font-family:system-ui,sans-serif;">AUM COPIED</div>
                    <div style="font-size:24px;font-weight:800;color:${theme.onBand};">$8.2M</div>
                  </div>
                  <div>
                    <div style="font-size:10px;font-weight:700;color:${theme.onBandDim};letter-spacing:0.14em;margin-bottom:6px;font-family:system-ui,sans-serif;">PROFIT SHARE</div>
                    <div style="font-size:24px;font-weight:800;color:${theme.onBand};">22%</div>
                  </div>
                  <div>
                    <div style="font-size:10px;font-weight:700;color:${theme.onBandDim};letter-spacing:0.14em;margin-bottom:6px;font-family:system-ui,sans-serif;">PAYOUT DATE</div>
                    <div style="font-size:24px;font-weight:800;color:${theme.onBand};">May 1, 2026</div>
                  </div>
                </div>`,
                { marginBottom: 0 }
              ),
            ]
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 48, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Become a Master Trader",
    description: "CTA encouraging pro traders to offer strategies with benefits list",
    category: "copy-trading",
    slug: "copy-trading-become-a-master-trader",
    type: "fullwidth",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: gradients.indigoViolet,
    },
  }
);
