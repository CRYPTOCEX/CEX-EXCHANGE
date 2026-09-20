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

const sentimentRow = (
  source: string,
  score: string,
  label: string,
  pct: number,
  accent: string
) =>
  row(
    [
      col(32, [
        el.text(source, {
          fontSize: 14,
          fontWeight: "600",
          color: theme.text,
          marginBottom: 0,
        }),
      ]),
      col(
        48,
        [
          col(
            100,
            [
              col(
                100,
                [el.text("", { marginBottom: 0 })],
                {
                  backgroundColor: accent,
                  borderRadius: 999,
                  height: "8px",
                  width: `${pct}%`,
                  maxWidth: `${pct}%`,
                }
              ) as any,
            ],
            {
              backgroundColor: theme.bgMuted,
              borderRadius: 999,
              height: "8px",
              width: "100%",
              paddingTop: 0,
              paddingBottom: 0,
              paddingLeft: 0,
              paddingRight: 0,
              marginTop: 8,
            }
          ) as any,
        ]
      ),
      col(10, [
        el.text(score, {
          fontSize: 14,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 0,
          textAlign: "right",
        }),
      ]),
      col(10, [
        el.text(label, {
          fontSize: 11,
          fontWeight: "700",
          color: accent,
          marginBottom: 0,
          textAlign: "right",
          letterSpacing: "0.08em",
        }),
      ]),
    ],
    {
      gutter: 12,
      maxWidth: "100%",
      paddingTop: 14,
      paddingBottom: 14,
      verticalAlign: "middle",
      borderBottom: true,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
    }
  );

export const aiFeaturesSentimentAnalysisFeature: Section = section(
  [
    row(
      [
        col(45, [
          el.text("SENTIMENT ANALYSIS", {
            fontSize: 12,
            fontWeight: "800",
            color: theme.sky,
            letterSpacing: "0.22em",
            marginBottom: 16,
          }),
          el.heading("The market mood, quantified", {
            level: "h2",
            fontSize: 42,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 20,
            letterSpacing: "-0.025em",
            lineHeight: "1.1",
          }),
          el.text(
            "Mash AI reads every major news outlet, X post, Reddit thread, and Telegram signal channel — then rolls it into a single -100 to +100 sentiment index, updated every 5 minutes.",
            {
              fontSize: 17,
              color: theme.textMuted,
              marginBottom: 28,
              lineHeight: "1.65",
            }
          ),
          el.list(
            [
              "12,000+ sources scanned daily",
              "Sarcasm & irony detection",
              "Whale-wallet narrative tracking",
              "Per-asset and per-sector breakdown",
            ],
            {
              fontSize: 15,
              color: theme.text,
              marginBottom: 32,
              listStyle: "check",
            }
          ),
          el.button("Open sentiment dashboard", "/ai/sentiment", {
            backgroundColor: theme.cssInfo,
            color: theme.onBand,
            marginRight: 0,
          }),
        ]),
        col(
          55,
          [
            row(
              [
                col(65, [
                  el.text("BTC SENTIMENT · 24H", {
                    fontSize: 11,
                    fontWeight: "800",
                    color: theme.textDim,
                    letterSpacing: "0.18em",
                    marginBottom: 8,
                  }),
                  el.heading("+68", {
                    level: "h3",
                    fontSize: 56,
                    fontWeight: "800",
                    color: theme.emerald,
                    letterSpacing: "-0.03em",
                    marginBottom: 0,
                  }),
                ]),
                col(35, [
                  el.text("BULLISH", {
                    fontSize: 12,
                    fontWeight: "800",
                    color: theme.onBand,
                    letterSpacing: "0.16em",
                    marginBottom: 0,
                    backgroundColor: theme.emerald,
                    borderRadius: 999,
                    paddingTop: 8,
                    paddingBottom: 8,
                    paddingLeft: 16,
                    paddingRight: 16,
                    textAlign: "center",
                    display: "inline-block",
                  }),
                ], { textAlign: "right", verticalAlign: "top" }),
              ],
              {
                gutter: 8,
                maxWidth: "100%",
                paddingTop: 0,
                paddingBottom: 24,
                marginBottom: 8,
                verticalAlign: "top",
              }
            ) as any,
            el.divider({ marginTop: 0, marginBottom: 12 }),
            el.text("BY SOURCE", {
              fontSize: 11,
              fontWeight: "800",
              color: theme.textDim,
              letterSpacing: "0.18em",
              marginBottom: 8,
            }),
            sentimentRow("News (CoinDesk, Bloomberg…)", "+72", "BULLISH", 86, theme.emerald) as any,
            sentimentRow("X / Twitter", "+54", "BULLISH", 77, theme.emerald) as any,
            sentimentRow("Reddit /r/cryptocurrency", "+41", "POSITIVE", 70, theme.sky) as any,
            sentimentRow("Telegram signal channels", "+12", "NEUTRAL", 56, theme.amber) as any,
            sentimentRow("Whale wallet activity", "-18", "BEARISH", 41, theme.rose) as any,
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
      ],
      { ...rowPresets.wide, gutter: 40, verticalAlign: "top" }
    ),
  ],
  {
    name: "Sentiment Analysis Feature",
    description: "Sentiment index card with source breakdown and explainer",
    category: "ai-features",
    slug: "ai-features-sentiment-analysis-feature",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
