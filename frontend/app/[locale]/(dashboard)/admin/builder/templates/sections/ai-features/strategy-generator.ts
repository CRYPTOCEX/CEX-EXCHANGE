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

const chip = (label: string, accent: string) =>
  col(
    100,
    [
      el.text(label, {
        fontSize: 12,
        fontWeight: "700",
        color: accent,
        marginBottom: 0,
      }),
    ],
    {
      // Was a pinned `--chart-4`-at-14% tint. `primarySoft` is the only soft
      // ground with a safelisted class fragment; the chip's state still reads
      // from its accent label.
      backgroundColor: theme.primarySoft,
      borderRadius: 999,
      paddingTop: 6,
      paddingBottom: 6,
      paddingLeft: 12,
      paddingRight: 12,
      width: "auto",
      maxWidth: "auto",
    }
  );

export const aiFeaturesStrategyGenerator: Section = section(
  [
    singleColumnRow([
      el.text("STRATEGY GENERATOR", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.violet,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("Describe a strategy. Get a backtested one.", {
        level: "h2",
        fontSize: 44,
        fontWeight: "800",
        textAlign: "center",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.025em",
        lineHeight: "1.1",
      }),
      el.text(
        "Type an idea in plain English. Mash AI translates it to code, backtests it on 5 years of data, and hands you the results — all under 30 seconds.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "680px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        col(
          50,
          [
            el.text("DESCRIBE YOUR STRATEGY", {
              fontSize: 11,
              fontWeight: "800",
              color: theme.textDim,
              letterSpacing: "0.18em",
              marginBottom: 16,
            }),
            el.text(
              "Buy ETH when the 20-day SMA crosses above the 50-day, RSI is below 60, and 4h volume is at least 30% above the weekly average. Exit on 8% gain, 4% stop-loss, or if the 20/50 crosses back.",
              {
                fontSize: 15,
                color: theme.text,
                lineHeight: "1.7",
                fontWeight: "500",
                marginBottom: 20,
                backgroundColor: theme.bgBase,
                borderRadius: 12,
                paddingTop: 18,
                paddingBottom: 18,
                paddingLeft: 20,
                paddingRight: 20,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: theme.border,
              }
            ),
            el.button("Generate & backtest", "#generate", {
              backgroundColor: theme.cssViolet,
              color: theme.onBand,
              fontSize: 15,
              width: "100%",
              marginRight: 0,
              marginTop: 0,
              paddingTop: 14,
              paddingBottom: 14,
              textAlign: "center",
            }),
          ],
          {
            backgroundColor: theme.bgCard,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            borderRadius: 20,
            paddingTop: 32,
            paddingBottom: 32,
            paddingLeft: 28,
            paddingRight: 28,
          }
        ),
        col(
          50,
          [
            row(
              [
                col(70, [
                  el.text("GENERATED STRATEGY", {
                    fontSize: 11,
                    fontWeight: "800",
                    color: theme.violet,
                    letterSpacing: "0.18em",
                    marginBottom: 8,
                  }),
                  el.heading("ETH · SMA 20/50 Momentum", {
                    level: "h4",
                    fontSize: 20,
                    fontWeight: "800",
                    color: theme.text,
                    marginBottom: 0,
                    letterSpacing: "-0.01em",
                  }),
                ]),
                col(30, [
                  chip("Ready", theme.emerald) as any,
                ], { textAlign: "right" }),
              ],
              { gutter: 8, maxWidth: "100%", paddingTop: 0, paddingBottom: 0, marginBottom: 24, verticalAlign: "top" }
            ) as any,
            row(
              [
                col(50, [
                  el.text("BACKTEST WINDOW", {
                    fontSize: 10,
                    fontWeight: "800",
                    color: theme.textDim,
                    letterSpacing: "0.15em",
                    marginBottom: 6,
                  }),
                  el.text("Jan 2020 – Mar 2026", {
                    fontSize: 14,
                    color: theme.text,
                    fontWeight: "600",
                    marginBottom: 0,
                  }),
                ]),
                col(50, [
                  el.text("TRADES TAKEN", {
                    fontSize: 10,
                    fontWeight: "800",
                    color: theme.textDim,
                    letterSpacing: "0.15em",
                    marginBottom: 6,
                  }),
                  el.text("147", {
                    fontSize: 14,
                    color: theme.text,
                    fontWeight: "600",
                    marginBottom: 0,
                  }),
                ]),
              ],
              { gutter: 16, maxWidth: "100%", paddingTop: 0, paddingBottom: 0, marginBottom: 20 }
            ) as any,
            el.divider({ marginTop: 0, marginBottom: 20 }),
            row(
              [
                col(33, [
                  el.heading("+142.8%", {
                    level: "h3",
                    fontSize: 28,
                    fontWeight: "800",
                    color: theme.emerald,
                    marginBottom: 4,
                    letterSpacing: "-0.02em",
                  }),
                  el.text("Total return", { fontSize: 12, color: theme.textDim, marginBottom: 0 }),
                ]),
                col(33, [
                  el.heading("2.34", {
                    level: "h3",
                    fontSize: 28,
                    fontWeight: "800",
                    color: theme.primary,
                    marginBottom: 4,
                    letterSpacing: "-0.02em",
                  }),
                  el.text("Sharpe ratio", { fontSize: 12, color: theme.textDim, marginBottom: 0 }),
                ]),
                col(34, [
                  el.heading("-11.2%", {
                    level: "h3",
                    fontSize: 28,
                    fontWeight: "800",
                    color: theme.rose,
                    marginBottom: 4,
                    letterSpacing: "-0.02em",
                  }),
                  el.text("Max drawdown", { fontSize: 12, color: theme.textDim, marginBottom: 0 }),
                ]),
              ],
              { gutter: 12, maxWidth: "100%", paddingTop: 0, paddingBottom: 0, marginBottom: 24 }
            ) as any,
            el.button("Deploy to paper account", "#deploy", {
              backgroundColor: theme.cssSuccess,
              color: theme.cssSuccessInk,
              fontSize: 14,
              width: "100%",
              marginRight: 0,
              marginTop: 0,
              paddingTop: 14,
              paddingBottom: 14,
              textAlign: "center",
            }),
          ],
          {
            backgroundColor: theme.bgCard,
            borderWidth: 2,
            borderStyle: "solid",
            borderColor: theme.violet,
            borderRadius: 20,
            paddingTop: 32,
            paddingBottom: 32,
            paddingLeft: 28,
            paddingRight: 28,
            boxShadowX: 0,
            boxShadowY: 20,
            boxShadowBlur: 50,
            boxShadowColor: "rgba(133,80,185,0.25)",
          }
        ),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Strategy Generator",
    description: "Natural-language strategy input + generated backtest output card",
    category: "ai-features",
    slug: "ai-features-strategy-generator",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
