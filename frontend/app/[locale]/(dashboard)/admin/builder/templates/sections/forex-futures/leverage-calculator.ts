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

/* Raw markup goes into an element's `content`, so every colour here is real
   CSS (the class branch never sees it) and can carry the token directly. The
   risk ramp is success -> warning -> destructive; the thumb is a page-surface
   knob with a `--primary` ring. */
const sliderTrack = `<div style="position:relative;height:8px;border-radius:999px;background:linear-gradient(to right,${theme.cssSuccess} 0%,${theme.cssWarning} 40%,${theme.cssDestructive} 100%);margin:28px 0 12px 0;">
  <div style="position:absolute;left:25%;top:-8px;width:24px;height:24px;border-radius:999px;background:${theme.cssBackground};border:3px solid ${theme.cssPrimary};box-shadow:0 4px 12px ${theme.cssPrimarySoft};"></div>
</div>
<div style="display:flex;justify-content:space-between;font-size:11px;color:${theme.cssMutedInk};font-weight:600;letter-spacing:0.08em;">
  <span>1x</span><span>10x</span><span>25x</span><span>50x</span><span>100x</span><span>125x</span>
</div>`;

const statBox = (label: string, value: string, color: string) =>
  el.card(
    {
      backgroundColor: theme.bgMuted,
      borderWidth: 0,
      borderRadius: 12,
      padding: 20,
    },
    [
      el.text(label, {
        fontSize: 11,
        fontWeight: "700",
        color: theme.textDim,
        letterSpacing: "0.12em",
        marginBottom: 6,
      }),
      el.heading(value, {
        level: "h4",
        fontSize: 24,
        fontWeight: "800",
        color,
        marginBottom: 0,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }),
    ]
  );

export const forexFuturesLeverageCalculator: Section = section(
  [
    singleColumnRow([
      el.text("POSITION SIZING", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("Size your position before you click", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "Drag the slider to see required margin, liquidation price, and maximum drawdown before opening a trade.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 48,
        }
      ),
    ]),
    singleColumnRow(
      [
        el.card(
          {
            backgroundColor: theme.bgCard,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 20,
            padding: 48,
            boxShadowX: 0,
            boxShadowY: 24,
            boxShadowBlur: 48,
            boxShadowColor: "rgba(10,18,32,0.08)",
          },
          [
            el.text("SELECT LEVERAGE", {
              fontSize: 12,
              fontWeight: "700",
              color: theme.textMuted,
              letterSpacing: "0.14em",
              marginBottom: 8,
            }),
            el.heading("25x", {
              level: "h3",
              fontSize: 72,
              fontWeight: "800",
              color: theme.primary,
              letterSpacing: "-0.04em",
              lineHeight: "1",
              marginBottom: 0,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }),
            el.text(sliderTrack, { marginBottom: 32 }),
          ]
        ),
      ],
      { ...rowPresets.narrow }
    ),
    row(
      [
        col(25, [statBox("COLLATERAL", "$1,000", theme.text)]),
        col(25, [statBox("POSITION SIZE", "$25,000", theme.sky)]),
        col(25, [statBox("LIQUIDATION", "$64,312", theme.rose)]),
        col(25, [statBox("MAINTENANCE MARGIN", "0.50%", theme.amber)]),
      ],
      { ...rowPresets.narrow, gutter: 16, marginTop: 24 }
    ),
    singleColumnRow(
      [
        el.text(
          "Leverage amplifies gains and losses. A 4% adverse move fully liquidates a 25x position.",
          {
            fontSize: 13,
            color: theme.rose,
            fontWeight: "600",
            textAlign: "center",
            marginTop: 32,
            marginBottom: 20,
          }
        ),
        el.button("Open position →", "/trade", {
          fontSize: 15,
          marginRight: 0,
        }),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Leverage Calculator",
    description: "Leverage slider visualization with required margin and liquidation preview",
    category: "forex-futures",
    slug: "forex-futures-leverage-calculator",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
