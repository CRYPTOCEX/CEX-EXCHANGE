import type { Section, Element } from "@/types/builder";
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

const orderRow = (price: string, amount: string, total: string, side: "bid" | "ask"): Element =>
  el.card(
    {
      /* These rgba values ARE the tokens: hsl(160 83.8% 33.9%) = rgb(14,159,111)
         (`--success`) and hsl(354 67.7% 53.9%) = rgb(217,58,74) (`--destructive`).
         They stay in rgba form because an element `backgroundColor` needs a
         literal — `hsl(var(--success) / 0.08)` contains a hyphen and would be
         routed to the class branch and dropped. At 8% the depth wash reads
         correctly over both the light and the dark page ground. */
      backgroundColor: side === "bid"
        ? "rgba(14,159,111,0.08)"
        : "rgba(217,58,74,0.08)",
      borderWidth: 0,
      borderRadius: 6,
      padding: 10,
      marginBottom: 4,
    },
    [
      el.text(
        `<span style="color:${side === "bid" ? theme.cssSuccess : theme.cssDestructive};font-weight:700;font-variant-numeric:tabular-nums;">${price}</span>&nbsp;&nbsp;<span style="color:${theme.cssMutedInk};font-variant-numeric:tabular-nums;">${amount}</span>&nbsp;&nbsp;<span style="color:${theme.cssMutedInk};font-variant-numeric:tabular-nums;float:right;">${total}</span>`,
        {
          fontSize: 13,
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }
      ),
    ]
  );

const header = () =>
  el.card(
    {
      backgroundColor: theme.bgMuted,
      borderWidth: 0,
      borderRadius: 6,
      padding: 10,
      marginBottom: 8,
    },
    [
      el.text(
        `<span style="font-weight:700;letter-spacing:0.08em;">PRICE (USDT)</span>&nbsp;&nbsp;<span style="font-weight:700;letter-spacing:0.08em;">AMOUNT</span>&nbsp;&nbsp;<span style="font-weight:700;letter-spacing:0.08em;float:right;">TOTAL</span>`,
        {
          fontSize: 11,
          color: theme.textDim,
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }
      ),
    ]
  );

export const tradingOrderBookPreview: Section = section(
  [
    singleColumnRow([
      el.text("LIVE ORDER BOOK", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("See the market's depth, in real time", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "Aggregated L2 order book across 14 venues — with iceberg detection and spoof filtering baked in.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "620px",
          marginBottom: 48,
        }
      ),
    ]),
    row(
      [
        col(50, [
          el.heading("ASKS", {
            level: "h4",
            fontSize: 13,
            fontWeight: "700",
            color: theme.rose,
            letterSpacing: "0.14em",
            marginBottom: 12,
          }),
          header(),
          orderRow("67,312.40", "0.8421", "56,682.12", "ask"),
          orderRow("67,308.15", "1.2140", "81,712.10", "ask"),
          orderRow("67,302.80", "0.4268", "28,732.55", "ask"),
          orderRow("67,298.60", "2.1184", "142,574.20", "ask"),
          orderRow("67,291.25", "0.7812", "52,585.40", "ask"),
          orderRow("67,286.90", "1.8432", "124,050.38", "ask"),
          orderRow("67,284.50", "0.5124", "34,487.54", "ask"),
        ]),
        col(50, [
          el.heading("BIDS", {
            level: "h4",
            fontSize: 13,
            fontWeight: "700",
            color: theme.emerald,
            letterSpacing: "0.14em",
            marginBottom: 12,
          }),
          header(),
          orderRow("67,280.10", "0.6842", "46,053.03", "bid"),
          orderRow("67,276.45", "1.4218", "95,674.90", "bid"),
          orderRow("67,272.80", "0.9164", "61,654.32", "bid"),
          orderRow("67,268.30", "2.3840", "160,370.10", "bid"),
          orderRow("67,264.15", "0.5421", "36,470.24", "bid"),
          orderRow("67,260.90", "1.7284", "116,274.68", "bid"),
          orderRow("67,256.50", "0.4128", "27,763.04", "bid"),
        ]),
      ],
      { ...rowPresets.narrow, gutter: 24, verticalAlign: "top" }
    ),
    singleColumnRow(
      [
        el.text(
          /* This is raw HTML with a `style` attribute, so it needs a real CSS
             colour — `theme.text` / `theme.textMuted` are Tailwind class names
             and would emit `color:card-foreground`, which CSSOM discards. The
             `css*` values are the inline-style form of the same tokens, and
             being tokens they follow the theme. */
          `<span style="font-weight:700;color:${theme.cssForeground};">Spread: 4.40 USDT (0.006%)</span> &nbsp;&nbsp; <span style="color:${theme.cssMutedInk};">Mid: 67,282.30 USDT</span>`,
          {
            textAlign: "center",
            fontSize: 14,
            marginTop: 32,
            marginBottom: 0,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }
        ),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Order Book Preview",
    description: "Mock L2 order book with bid/ask ladder styled for depth visualization",
    category: "trading",
    slug: "trading-order-book-preview",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
