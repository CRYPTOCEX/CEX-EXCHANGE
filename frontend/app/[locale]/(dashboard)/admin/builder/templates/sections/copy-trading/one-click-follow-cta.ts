import type { Section, Element, Column, Row } from "@/types/builder";
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

const miniStat = (label: string, value: string): Element =>
  el.card(
    {
      backgroundColor: theme.onBandFill,
      borderWidth: 0,
      borderRadius: 10,
      padding: 16,
    },
    [
      el.text(label, {
        fontSize: 10,
        fontWeight: "700",
        color: theme.onBandDim,
        letterSpacing: "0.14em",
        marginBottom: 4,
      }),
      el.text(value, {
        fontSize: 22,
        fontWeight: "800",
        // Pinned ink: these tiles sit on a deliberate dark band, so a
        // theme-following accent would go dark-on-dark in light mode.
        color: theme.onBand,
        marginBottom: 0,
        letterSpacing: "-0.01em",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }),
    ]
  );

const nestedRow = (columns: Column[], settings: Record<string, unknown> = {}): Row =>
  row(columns, { gutter: 24, maxWidth: "100%", ...settings });

export const copyTradingOneClickFollowCta: Section = section(
  [
    row(
      [
        {
          ...col(100, [], {
            paddingTop: 64,
            paddingBottom: 64,
            paddingLeft: 64,
            paddingRight: 64,
            backgroundColor: gradients.indigoViolet,
            borderWidth: 0,
            borderRadius: 24,
            boxShadowX: 0,
            boxShadowY: 36,
            boxShadowBlur: 72,
            boxShadowSpread: -16,
            boxShadowColor: "rgba(31,113,235,0.5)",
          }),
          rows: [
            // Header: featured-trader pill + headline
            nestedRow(
              [
                col(35, [
                  el.text(
                    `<div style="display:flex;align-items:center;gap:16px;">
                      <img src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80" alt="Featured trader Alexei Volkov avatar" style="width:96px;height:96px;border-radius:999px;object-fit:cover;border:3px solid ${theme.onBandBorder};flex-shrink:0;" />
                      <div>
                        <span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${theme.onBandFill};color:${theme.onBand};font-size:10px;font-weight:800;letter-spacing:0.14em;">⭐ TOP 1%</span>
                        <div style="font-size:28px;font-weight:800;color:${theme.onBand};letter-spacing:-0.02em;margin-top:10px;margin-bottom:4px;">Alexei Volkov</div>
                        <div style="font-size:14px;color:${theme.onBandDim};">@volkov_fx · FX & Crypto · 4y</div>
                      </div>
                    </div>`,
                    { marginBottom: 0 }
                  ),
                ]),
                col(65, [
                  el.text("FEATURED TRADER", {
                    fontSize: 11,
                    fontWeight: "800",
                    color: theme.onBandDim,
                    letterSpacing: "0.2em",
                    marginBottom: 12,
                  }),
                  el.heading("Mirror his every trade — in one click", {
                    fontSize: 36,
                    fontWeight: "800",
                    color: theme.onBand,
                    letterSpacing: "-0.025em",
                    lineHeight: "1.1",
                    marginBottom: 18,
                  }),
                  el.text(
                    "Up to 184% ROI over the last 30 days with a disciplined 2% per-trade risk cap. 12,482 active copiers and counting.",
                    {
                      fontSize: 16,
                      color: theme.onBandMuted,
                      lineHeight: "1.6",
                      marginBottom: 0,
                    }
                  ),
                ]),
              ],
              { gutter: 40, verticalAlign: "middle", marginBottom: 32 }
            ),
            // Stats row
            nestedRow(
              [
                col(20, [miniStat("30D ROI", "+184.2%")]),
                col(20, [miniStat("WIN RATE", "78.4%")]),
                col(20, [miniStat("MAX DD", "-11.2%")]),
                col(20, [miniStat("COPIERS", "12,482")]),
                col(20, [miniStat("AUM", "$8.2M")]),
              ],
              { gutter: 12, verticalAlign: "middle", marginBottom: 36 }
            ),
            // CTA row
            nestedRow([
              col(
                100,
                [
                  el.button("Copy now — allocate capital", "/copy/volkov_fx", {
                    backgroundColor: theme.onBandSurface,
                    color: theme.onBandSurfaceInk,
                    fontSize: 18,
                    fontWeight: "700",
                    paddingTop: 20,
                    paddingBottom: 20,
                    paddingLeft: 56,
                    paddingRight: 56,
                    width: "100%",
                    marginRight: 0,
                    borderRadius: 14,
                  }),
                  el.text(
                    "Starting from $100 • Pause or cancel anytime • 20% performance fee on profits only",
                    {
                      fontSize: 13,
                      color: theme.onBandDim,
                      textAlign: "center",
                      marginTop: 16,
                      marginBottom: 0,
                    }
                  ),
                ],
                { textAlign: "center" }
              ),
            ]),
          ],
        },
      ],
      { ...rowPresets.contained }
    ),
  ],
  {
    name: "One-Click Follow CTA",
    description: "Featured trader card with huge Copy Now button and live stats",
    category: "copy-trading",
    slug: "copy-trading-one-click-follow-cta",
    type: "fullwidth",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
