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

export const tradingTradingViewEmbed: Section = section(
  [
    singleColumnRow([
      el.text("POWERED BY TRADINGVIEW", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.sky,
        letterSpacing: "0.2em",
        marginBottom: 14,
      }),
      el.heading("Pro charts. 100+ indicators. Zero limits.", {
        textAlign: "center",
        fontSize: 48,
        fontWeight: "800",
        letterSpacing: "-0.03em",
        lineHeight: "1.08",
        marginBottom: 16,
        maxWidth: "860px",
      }),
      el.text(
        "The full TradingView suite, embedded natively. Draw tools, multi-chart layouts, custom Pine Script — all tied to live order execution.",
        {
          fontSize: 19,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "720px",
          marginBottom: 36,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(100, [
          el.button("Open live chart", "/chart/BTCUSDT", {
            fontSize: 16,
            marginRight: 12,
          }),
          el.button("Browse indicators", "/indicators", {
            backgroundColor: "transparent",
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            fontSize: 16,
          }),
        ], { textAlign: "center" }),
      ],
      { ...rowPresets.narrow, textAlign: "center", marginBottom: 16 }
    ),
    singleColumnRow(
      [
        el.image(
          "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=2000&q=85",
          "Advanced TradingView chart with indicators and candlestick patterns",
          {
            borderRadius: 20,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            boxShadowX: 0,
            boxShadowY: 48,
            boxShadowBlur: 96,
            boxShadowSpread: -16,
            boxShadowColor: "rgba(10,18,32,0.35)",
            marginTop: 40,
            maxWidth: "1200px",
          }
        ),
      ],
      { ...rowPresets.wide, textAlign: "center" }
    ),
    row(
      [
        col(25, [
          el.text("100+", {
            fontSize: 36,
            fontWeight: "800",
            color: theme.text,
            textAlign: "center",
            marginBottom: 4,
          }),
          el.text("BUILT-IN INDICATORS", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]),
        col(25, [
          el.text("12", {
            fontSize: 36,
            fontWeight: "800",
            color: theme.text,
            textAlign: "center",
            marginBottom: 4,
          }),
          el.text("CHART LAYOUTS", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]),
        col(25, [
          el.text("50+", {
            fontSize: 36,
            fontWeight: "800",
            color: theme.text,
            textAlign: "center",
            marginBottom: 4,
          }),
          el.text("DRAWING TOOLS", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]),
        col(25, [
          el.text("< 50ms", {
            fontSize: 36,
            fontWeight: "800",
            color: theme.text,
            textAlign: "center",
            marginBottom: 4,
          }),
          el.text("DATA LATENCY", {
            fontSize: 11,
            fontWeight: "700",
            color: theme.textMuted,
            letterSpacing: "0.12em",
            textAlign: "center",
            marginBottom: 0,
          }),
        ]),
      ],
      { ...rowPresets.wide, gutter: 16, marginTop: 48 }
    ),
  ],
  {
    name: "TradingView Embed",
    description: "Large chart-mockup placeholder with TradingView branding area and CTA",
    category: "trading",
    slug: "trading-trading-view-embed",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
