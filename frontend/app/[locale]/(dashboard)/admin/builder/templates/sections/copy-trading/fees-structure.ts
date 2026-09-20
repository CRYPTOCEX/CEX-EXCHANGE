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

const feeTier = (
  name: string,
  share: string,
  bestFor: string,
  features: string[],
  highlighted: boolean
): Element =>
  el.card(
    {
      backgroundColor: highlighted ? theme.primarySoft : theme.bgCard,
      borderColor: highlighted ? theme.primary : theme.border,
      borderWidth: highlighted ? 2 : 1,
      borderRadius: 20,
      padding: 40,
      boxShadowX: 0,
      boxShadowY: highlighted ? 28 : 8,
      boxShadowBlur: highlighted ? 56 : 20,
      boxShadowSpread: -12,
      // Real CSS — `getElementStyle` builds a `box-shadow` shorthand from this
      // and the vocabulary has no shadow colour. Both values are already an
      // alpha cut of a token: rgb(31,113,235) is `--primary` (light) and
      // rgb(10,18,32) is `theme.bandInk`.
      boxShadowColor: highlighted
        ? "rgba(31,113,235,0.4)"
        : "rgba(10,18,32,0.04)",
    },
    [
      ...(highlighted
        ? [
            el.text("MOST POPULAR", {
              fontSize: 11,
              fontWeight: "800",
              color: theme.primary,
              letterSpacing: "0.16em",
              marginBottom: 14,
            }),
          ]
        : []),
      el.text(name.toUpperCase(), {
        fontSize: 12,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.14em",
        marginBottom: 14,
      }),
      // Raw HTML, so these are real CSS rather than class fragments. The card
      // sits on the page surface (not a pinned band), so theme-following tokens
      // are correct. Both caption lines take `--muted-foreground`: the dimmer
      // `--subtle-foreground` measures 4.35:1 on the light `--background`,
      // under the 4.5 floor for 12-14px copy. Hierarchy is carried by size and
      // weight instead of a second ink step.
      el.text(
        `<div style="display:flex;align-items:flex-end;gap:12px;margin-bottom:16px;"><div style="font-size:56px;font-weight:800;color:${highlighted ? theme.cssPrimary : theme.cssForeground};letter-spacing:-0.035em;line-height:1;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${share}</div><div style="padding-bottom:6px;"><div style="font-size:14px;color:${theme.cssMutedInk};font-weight:600;">profit share</div><div style="font-size:12px;color:${theme.cssMutedInk};">on winning trades only</div></div></div>`,
        { marginBottom: 0 }
      ),
      el.text(bestFor, {
        fontSize: 14,
        color: theme.textMuted,
        lineHeight: "1.6",
        marginBottom: 24,
      }),
      el.divider({ marginTop: 0, marginBottom: 20 }),
      el.list(features, { fontSize: 14, marginBottom: 28 }),
      el.button(highlighted ? "Start copying" : "Select tier", "/copy-trading", {
        width: "100%",
        fontSize: 15,
        marginRight: 0,
        backgroundColor: highlighted ? theme.primary : theme.bgMuted,
        color: highlighted ? theme.primaryText : theme.text,
      }),
    ]
  );

export const copyTradingFeesStructure: Section = section(
  [
    singleColumnRow([
      el.text("FEE STRUCTURE", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("You only pay when your trader wins", {
        textAlign: "center",
        fontSize: 46,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "No subscription fees. No platform charges. Providers earn only on the profit they generate for you — fully aligned incentives.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "700px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(33.33, [
          feeTier(
            "Starter",
            "15%",
            "For new copiers testing the waters with a single trader.",
            [
              "Copy 1 trader at a time",
              "$100 minimum allocation",
              "Standard risk controls",
              "Daily profit settlement",
              "Community support",
            ],
            false
          ),
        ]),
        col(33.33, [
          feeTier(
            "Portfolio",
            "20%",
            "For investors diversifying across multiple trading styles.",
            [
              "Copy up to 10 traders simultaneously",
              "$500 minimum allocation",
              "Advanced risk controls (stop-loss, asset filters)",
              "Real-time profit settlement",
              "Priority chat support",
              "Tax-ready transaction export",
            ],
            true
          ),
        ]),
        col(33.33, [
          feeTier(
            "VIP",
            "25%",
            "For high-net-worth copiers seeking bespoke service.",
            [
              "Unlimited traders, unlimited allocation",
              "$50,000 minimum allocation",
              "Dedicated portfolio manager",
              "Custom execution rules",
              "Quarterly performance reviews",
              "Private access to top-10 providers",
              "24/7 concierge support",
            ],
            false
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
    singleColumnRow(
      [
        el.text(
          "<strong>High-water mark rule:</strong> performance fees only apply on <em>new</em> profit above your account's prior peak. No double-charging on drawdown recoveries.",
          {
            fontSize: 13,
            color: theme.textDim,
            textAlign: "center",
            marginTop: 40,
            marginBottom: 0,
            maxWidth: "720px",
          }
        ),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Fees Structure",
    description: "Three-tier copy-trading fee structure with profit share percentages",
    category: "copy-trading",
    slug: "copy-trading-fees-structure",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
