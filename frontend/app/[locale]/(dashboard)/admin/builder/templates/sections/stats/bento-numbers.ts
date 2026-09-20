import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  gradients,
  sectionPresets,
  rowPresets,
} from "../../utils";
import type { Element } from "@/types/builder";

const smallTile = (value: string, label: string, sub: string): Element =>
  el.card(
    {
      padding: 28,
      borderRadius: 18,
      marginBottom: 24,
    },
    [
      el.heading(value, {
        fontSize: 44,
        fontWeight: "700",
        letterSpacing: "-0.02em",
        color: theme.text,
        marginBottom: 6,
        level: "h3",
      }),
      el.text(label, {
        fontSize: 14,
        fontWeight: "700",
        color: theme.textMuted,
        letterSpacing: "0.1em",
        marginBottom: 8,
      }),
      el.text(sub, {
        fontSize: 13,
        color: theme.textMuted,
        lineHeight: "1.55",
        marginBottom: 0,
      }),
    ]
  );

export const statsBentoNumbers: Section = section(
  [
    singleColumnRow([
      el.text("SCALE", {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.14em",
        marginBottom: 12,
      }),
      el.heading("A platform built at real volume", {
        textAlign: "center",
        fontSize: 44,
        color: theme.text,
        marginBottom: 48,
      }),
    ]),
    row(
      [
        col(50, [
          el.card(
            {
              padding: 48,
              borderRadius: 24,
              backgroundColor: gradients.indigoViolet,
              borderWidth: 0,
            },
            [
              el.text("24H VOLUME", {
                fontSize: 13,
                fontWeight: "700",
                color: theme.onBandMuted,
                letterSpacing: "0.14em",
                marginBottom: 20,
              }),
              el.heading("$2.4B", {
                fontSize: 104,
                fontWeight: "800",
                lineHeight: "1",
                letterSpacing: "-0.04em",
                color: theme.onBand,
                marginBottom: 20,
                level: "h3",
              }),
              el.text(
                "Cleared across spot, futures, and options venues every 24 hours — up 8.2% on the trailing week.",
                {
                  fontSize: 16,
                  color: theme.onBandMuted,
                  lineHeight: "1.55",
                  marginBottom: 0,
                }
              ),
            ]
          ),
        ]),
        col(50, [
          smallTile("240K", "ACTIVE TRADERS", "Verified monthly actives across 140 countries."),
          smallTile("150+", "TRADING PAIRS", "Spot, perp, and options across five asset classes."),
          smallTile("24/7", "MARKETS", "Crypto trades around the clock, and so does the desk."),
        ]),
      ],
      { ...rowPresets.contained, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Bento Numbers",
    description: "Bento layout: one huge stat tile plus three smaller stat tiles",
    category: "stats",
    slug: "stats-bento-numbers",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
