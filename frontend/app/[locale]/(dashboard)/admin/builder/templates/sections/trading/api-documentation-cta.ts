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

/* The syntax-highlight hues below are a code-editor theme, not page ink: they
   sit on the pinned `bandInk` terminal card and each one clears 4.5:1 on it
   (pink 7.2, amber 15.3, sky 11.4, mint 14.8). They are deliberately NOT
   re-pointed at `--primary`/`--chart-4`/`--destructive`: those tokens fork with
   the theme, and their LIGHT values land at 4.2:1, 3.6:1 and 4.2:1 on a ground
   that does not fork — a regression. The two greys, which are ink rather than
   syntax, do come from the band vocabulary. */
const codeSample = `<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.7;">
<span style="color:${theme.onBandDim};"># Place a limit order via REST</span><br/>
<span style="color:#f472b6;">curl</span> <span style="color:#fde68a;">-X POST</span> <span style="color:#7dd3fc;">https://api.exchange.com/v1/orders</span> \\<br/>
&nbsp;&nbsp;<span style="color:#fde68a;">-H</span> <span style="color:#a7f3d0;">"X-API-KEY: $APEX_KEY"</span> \\<br/>
&nbsp;&nbsp;<span style="color:#fde68a;">-H</span> <span style="color:#a7f3d0;">"Content-Type: application/json"</span> \\<br/>
&nbsp;&nbsp;<span style="color:#fde68a;">-d</span> <span style="color:#a7f3d0;">'{</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#a7f3d0;">"symbol": "BTC-USDT",</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#a7f3d0;">"side": "BUY",</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#a7f3d0;">"type": "LIMIT",</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#a7f3d0;">"quantity": 0.5,</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#a7f3d0;">"price": 67284.50,</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#a7f3d0;">"timeInForce": "GTC"</span><br/>
&nbsp;&nbsp;<span style="color:#a7f3d0;">}'</span><br/><br/>
<span style="color:${theme.onBandDim};"># Response &mdash; fill acknowledged in &lt; 10ms</span><br/>
<span style="color:#a7f3d0;">{ "orderId": "0xf2c9...", "status": "NEW", "ts": 1714032187421 }</span>
</div>`;

export const tradingApiDocumentationCta: Section = section(
  [
    row(
      [
        col(50, [
          el.text("DEVELOPER API", {
            fontSize: 12,
            fontWeight: "700",
            color: theme.sky,
            letterSpacing: "0.18em",
            marginBottom: 16,
          }),
          el.heading("Ship your trading stack in hours, not months", {
            fontSize: 52,
            fontWeight: "800",
            letterSpacing: "-0.03em",
            lineHeight: "1.05",
            marginBottom: 20,
          }),
          el.text(
            "Signed REST and WebSocket endpoints, with per-key rate limits and IP allow-listing.",
            {
              fontSize: 18,
              color: theme.textMuted,
              marginBottom: 28,
              lineHeight: "1.65",
              maxWidth: "480px",
            }
          ),
          el.list(
            [
              "Signed REST + WebSocket endpoints",
              "SDKs for Python, TypeScript, Go, Rust, and Java",
              "Unified spot, margin, futures, and options",
              "Rate-limit bursts up to 2,500 req/s for VIP tier",
              "Sandbox with free paper-trading balances",
            ],
            { fontSize: 15, marginBottom: 32 }
          ),
          el.button("Get API keys", "/settings/api", {
            fontSize: 15,
            marginRight: 12,
          }),
          el.button("Read the docs", "/docs/api", {
            backgroundColor: "transparent",
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            fontSize: 15,
          }),
        ]),
        col(50, [
          el.card(
            {
              backgroundColor: theme.bandInk,
              borderColor: theme.onBandFill,
              borderWidth: 1,
              borderRadius: 16,
              padding: 28,
              boxShadowX: 0,
              boxShadowY: 28,
              boxShadowBlur: 56,
              // Glow under the terminal card. `getElementStyle` interpolates
              // this straight into a `box-shadow` shorthand, so it has to be
              // real CSS; the token vocabulary has no shadow colour, and the
              // card it sits under is pinned dark in both themes, so a
              // theme-following value would be wrong here anyway.
              boxShadowColor: "rgba(9,92,113,0.30)",
            },
            [
              el.text(
                `<span style="display:inline-block;height:10px;width:10px;border-radius:999px;background:${theme.cssDestructive};margin-right:6px;"></span><span style="display:inline-block;height:10px;width:10px;border-radius:999px;background:${theme.cssWarning};margin-right:6px;"></span><span style="display:inline-block;height:10px;width:10px;border-radius:999px;background:${theme.cssSuccess};margin-right:12px;"></span><span style="color:${theme.onBandDim};font-size:12px;">terminal &mdash; POST /v1/orders</span>`,
                { marginBottom: 16, fontSize: 12 }
              ),
              el.text(codeSample, {
                marginBottom: 0,
                color: theme.onBandMuted,
              }),
            ]
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 56, verticalAlign: "middle" }
    ),
  ],
  {
    name: "API Documentation CTA",
    description: "Code-sample mock with Get API keys CTA",
    category: "trading",
    slug: "trading-api-documentation-cta",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
