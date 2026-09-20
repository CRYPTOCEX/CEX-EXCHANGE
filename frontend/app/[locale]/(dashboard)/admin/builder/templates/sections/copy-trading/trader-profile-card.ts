import type { Section, Element, Column, Row } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

const statBlock = (label: string, value: string, color?: string): Element =>
  el.card(
    {
      backgroundColor: theme.bgMuted,
      borderWidth: 0,
      borderRadius: 10,
      padding: 16,
    },
    [
      el.text(label, {
        fontSize: 10,
        fontWeight: "700",
        color: theme.textDim,
        letterSpacing: "0.14em",
        marginBottom: 6,
      }),
      el.text(value, {
        fontSize: 20,
        fontWeight: "800",
        color: color ?? theme.text,
        letterSpacing: "-0.01em",
        marginBottom: 0,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }),
    ]
  );

/* The equity curve is an SVG string, i.e. raw markup, so it takes real CSS.
   `stop-color` / `stroke` are written as `style` declarations rather than
   presentation attributes so `var()` substitution is unambiguous in every
   engine — the token then follows the theme like the rest of the card. */
const chartSvg = `<svg viewBox="0 0 320 120" width="100%" height="120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style="stop-color:${theme.cssSuccess};stop-opacity:0.35"/><stop offset="100%" style="stop-color:${theme.cssSuccess};stop-opacity:0"/></linearGradient></defs><path d="M0,100 L20,92 L40,86 L60,78 L80,82 L100,70 L120,66 L140,58 L160,52 L180,46 L200,42 L220,34 L240,30 L260,22 L280,18 L300,14 L320,10 L320,120 L0,120 Z" fill="url(#tg)"/><path d="M0,100 L20,92 L40,86 L60,78 L80,82 L100,70 L120,66 L140,58 L160,52 L180,46 L200,42 L220,34 L240,30 L260,22 L280,18 L300,14 L320,10" style="stroke:${theme.cssSuccess}" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

// Column with pre-populated nested rows (bento-grid style)
const wideCol = (width: number, elements: Element[], settings: Record<string, unknown> = {}): Column => ({
  ...col(width, elements, settings),
});

// The outer "card wrapper" uses a styled column (single-column row) that
// contains nested rows — this lets us place rows inside a card-like shell.
const nestedRow = (columns: Column[], settings: Record<string, unknown> = {}): Row =>
  row(columns, { gutter: 24, maxWidth: "100%", ...settings });

export const copyTradingTraderProfileCard: Section = section(
  [
    row(
      [
        {
          ...col(100, [], {
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
            borderWidth: 1,
            borderStyle: "solid",
            borderRadius: 20,
            padding: 40,
            boxShadowX: 0,
            boxShadowY: 20,
            boxShadowBlur: 48,
            boxShadowSpread: -12,
            boxShadowColor: "rgba(10,18,32,0.08)",
          }),
          rows: [
            // Header row: avatar+bio | equity chart card
            nestedRow(
              [
                wideCol(55, [
                  /* All raw HTML, so every colour here is real CSS and can carry
                     the token directly. `#09090b` for the trader name was the
                     bug this migration exists to kill: a near-black literal on
                     `theme.bgCard`, which is white in light mode and near-black
                     in dark — the name simply vanished in dark mode.

                     The VERIFIED pill is a pinned `bandSuccess` ground with
                     `onBand` ink rather than a soft success tint, because a
                     10px/800 label on `hsl(var(--success) / 0.12)` measures only
                     3.39:1 in light mode. On the band it is 7.5:1+ in both. */
                  el.text(
                    `<div style="display:flex;align-items:center;gap:20px;">
                      <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80" alt="Trader Mei Tanaka profile photo" style="width:96px;height:96px;border-radius:999px;object-fit:cover;border:3px solid ${theme.cssPrimary};flex-shrink:0;" />
                      <div>
                        <span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${theme.bandSuccess};color:${theme.onBand};font-size:10px;font-weight:800;letter-spacing:0.14em;margin-bottom:10px;">✓ VERIFIED · TOP 1%</span>
                        <div style="font-size:32px;font-weight:800;letter-spacing:-0.02em;color:${theme.cssForeground};margin-top:10px;margin-bottom:4px;">Mei Tanaka</div>
                        <div style="font-size:14px;color:${theme.cssDimInk};margin-bottom:10px;">@mei_tanaka · Tokyo, Japan · Trading since 2019</div>
                        <div style="font-size:15px;color:${theme.cssMutedInk};line-height:1.6;">Systematic momentum trader specializing in BTC and ETH perpetuals. Disciplined 1.5% per-trade risk with a max 12% portfolio drawdown cap.</div>
                      </div>
                    </div>`,
                    { marginBottom: 0 }
                  ),
                ]),
                wideCol(45, [
                  el.card(
                    {
                      backgroundColor: theme.bgMuted,
                      borderWidth: 0,
                      borderRadius: 14,
                      padding: 24,
                    },
                    [
                      el.text(chartSvg, { marginBottom: 12 }),
                      el.text(
                        `<span style="font-size:11px;font-weight:700;color:${theme.cssDimInk};letter-spacing:0.12em;">90D EQUITY CURVE</span>&nbsp;&nbsp;<span style="color:${theme.cssSuccess};font-weight:700;font-size:14px;">+147.8%</span>`,
                        { marginBottom: 0 }
                      ),
                    ]
                  ),
                ]),
              ],
              { gutter: 32, verticalAlign: "middle", marginBottom: 32 }
            ),
            // Divider row
            nestedRow([
              wideCol(100, [
                el.divider({ marginTop: 0, marginBottom: 28 }),
              ]),
            ]),
            // 6-column stats
            nestedRow(
              [
                wideCol(16.66, [statBlock("30D ROI", "+147.8%", theme.emerald)]),
                wideCol(16.66, [statBlock("WIN RATE", "71.2%", theme.text)]),
                wideCol(16.66, [statBlock("SHARPE", "2.84", theme.text)]),
                wideCol(16.66, [statBlock("MAX DD", "-9.8%", theme.amber)]),
                wideCol(16.66, [statBlock("COPIERS", "9,821", theme.text)]),
                wideCol(16.66, [statBlock("AUM", "$6.4M", theme.text)]),
              ],
              { gutter: 12, verticalAlign: "top", marginBottom: 32 }
            ),
            nestedRow([
              wideCol(100, [
                el.divider({ marginTop: 0, marginBottom: 24 }),
              ]),
            ]),
            // Footer row
            nestedRow(
              [
                wideCol(60, [
                  el.text("FAVORITE INSTRUMENTS", {
                    fontSize: 10,
                    fontWeight: "700",
                    color: theme.textDim,
                    letterSpacing: "0.14em",
                    marginBottom: 8,
                  }),
                  /* `#eef2ff` on `#4338ca` was a pale-indigo pill pinned to the
                     LIGHT palette — on the dark card it stayed a near-white
                     slab. `cssPrimary` + `cssPrimaryInk` is the guaranteed
                     pairing and forks with the theme: 4.56:1 light, 6.33:1 dark
                     at 12px/700. */
                  el.text(
                    ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"]
                      .map(
                        (pair, i, all) =>
                          `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${theme.cssPrimary};color:${theme.cssPrimaryInk};font-size:12px;font-weight:700;${i < all.length - 1 ? "margin-right:6px;" : ""}">${pair}</span>`
                      )
                      .join(""),
                    { fontSize: 12, marginBottom: 0 }
                  ),
                ]),
                wideCol(40, [
                  el.button("Copy Mei's portfolio", "/copy/mei_tanaka", {
                    fontSize: 15,
                    width: "100%",
                    marginRight: 0,
                    marginTop: 0,
                  }),
                ]),
              ],
              { gutter: 24, verticalAlign: "middle" }
            ),
          ],
        },
      ],
      { ...rowPresets.contained }
    ),
  ],
  {
    name: "Trader Profile Card",
    description: "Detailed single trader profile with stats grid and equity curve mock",
    category: "copy-trading",
    slug: "copy-trading-trader-profile-card",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
