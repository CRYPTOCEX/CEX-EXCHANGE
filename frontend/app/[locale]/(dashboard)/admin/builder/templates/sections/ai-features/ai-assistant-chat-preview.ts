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

const userBubble = (text: string) =>
  col(
    100,
    [
      el.text(text, {
        fontSize: 14,
        color: theme.onBand,
        marginBottom: 0,
        lineHeight: "1.55",
      }),
    ],
    {
      backgroundColor: theme.primary,
      borderRadius: 16,
      borderBottomRightRadius: 4,
      paddingTop: 14,
      paddingBottom: 14,
      paddingLeft: 18,
      paddingRight: 18,
      maxWidth: "70%",
      marginLeft: "auto",
      marginBottom: 14,
    }
  );

const aiBubble = (text: string) =>
  col(
    100,
    [
      el.text("MASH AI", {
        fontSize: 10,
        fontWeight: "800",
        color: theme.violet,
        letterSpacing: "0.18em",
        marginBottom: 6,
      }),
      el.text(text, {
        fontSize: 14,
        color: theme.text,
        marginBottom: 0,
        lineHeight: "1.6",
      }),
    ],
    {
      backgroundColor: theme.bgMuted,
      borderRadius: 16,
      borderBottomLeftRadius: 4,
      paddingTop: 14,
      paddingBottom: 14,
      paddingLeft: 18,
      paddingRight: 18,
      maxWidth: "80%",
      marginBottom: 14,
    }
  );

export const aiFeaturesAiAssistantChatPreview: Section = section(
  [
    row(
      [
        col(45, [
          el.text("MASH AI ASSISTANT", {
            fontSize: 12,
            fontWeight: "800",
            color: theme.violet,
            letterSpacing: "0.22em",
            marginBottom: 16,
          }),
          el.heading("Ask your trading questions in plain English", {
            level: "h2",
            fontSize: 42,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 20,
            letterSpacing: "-0.025em",
            lineHeight: "1.1",
          }),
          el.text(
            "Portfolio health checks, strategy reviews, on-chain wallet lookups — Mash AI answers in seconds with sources and chart links attached.",
            {
              fontSize: 17,
              color: theme.textMuted,
              marginBottom: 24,
              lineHeight: "1.65",
            }
          ),
          el.list(
            [
              "Cites every data source",
              "Streams answers in under 1.2s",
              "Connects to your live portfolio",
              "On-device mode for sensitive questions",
            ],
            {
              fontSize: 15,
              color: theme.text,
              marginBottom: 32,
              listStyle: "check",
            }
          ),
          el.button("Open Mash AI", "/ai", {
            backgroundColor: theme.cssViolet,
            color: theme.onBand,
            marginRight: 0,
          }),
        ]),
        col(
          55,
          [
            row(
              [
                col(20, [
                  el.icon("lucide:sparkles", {
                    size: 20,
                    color: theme.onBand,
                    marginBottom: 0,
                  }),
                ], {
                  backgroundColor: theme.violet,
                  borderRadius: 999,
                  width: "40px",
                  maxWidth: "40px",
                  height: "40px",
                  paddingTop: 10,
                  paddingBottom: 10,
                  paddingLeft: 0,
                  paddingRight: 0,
                  textAlign: "center",
                }),
                col(80, [
                  el.heading("Mash AI", {
                    level: "h4",
                    fontSize: 15,
                    fontWeight: "700",
                    color: theme.text,
                    marginBottom: 2,
                  }),
                  el.text("Online · gpt-traderv3", {
                    fontSize: 12,
                    color: theme.emerald,
                    marginBottom: 0,
                  }),
                ], { paddingLeft: 14 }),
              ],
              {
                gutter: 0,
                maxWidth: "100%",
                paddingTop: 0,
                paddingBottom: 20,
                borderBottom: true,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: theme.border,
                marginBottom: 20,
                verticalAlign: "middle",
              }
            ) as any,
            userBubble("Is now a good time to add to my ETH position?") as any,
            aiBubble(
              "Short answer: cautious. ETH is pressing the upper band of a multi-week range at $3,180 with RSI at 68 on the 4h. Volume on the last push was 22% below average. If you're scaling in, consider waiting for a retest of $3,050-$3,080 — that's where the 50d EMA and prior breakout level converge."
            ) as any,
            userBubble("What's my portfolio's drawdown risk?") as any,
            aiBubble(
              "Your 30-day max drawdown was -8.4% (vs -14% for BTC). Concentration risk is moderate: ETH is 47% of book. Running a VaR(95) — if correlations spike, you're looking at ~$4,200 at risk over 7 days. Want me to model a 10% SOL hedge?"
            ) as any,
            row(
              [
                col(85, [
                  el.text("Ask Mash AI anything…", {
                    fontSize: 14,
                    color: theme.textDim,
                    marginBottom: 0,
                  }),
                ]),
                col(15, [
                  el.icon("lucide:send", {
                    size: 18,
                    color: theme.violet,
                    marginBottom: 0,
                  }),
                ], { textAlign: "right" }),
              ],
              {
                gutter: 0,
                maxWidth: "100%",
                paddingTop: 14,
                paddingBottom: 14,
                paddingLeft: 18,
                paddingRight: 18,
                backgroundColor: theme.bgMuted,
                borderRadius: 999,
                marginTop: 8,
                verticalAlign: "middle",
              }
            ) as any,
          ],
          {
            backgroundColor: theme.bgCard,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            borderRadius: 24,
            paddingTop: 28,
            paddingBottom: 28,
            paddingLeft: 28,
            paddingRight: 28,
            boxShadowX: 0,
            boxShadowY: 30,
            boxShadowBlur: 60,
            boxShadowColor: "rgba(133,80,185,0.22)",
          }
        ),
      ],
      { ...rowPresets.wide, gutter: 48, verticalAlign: "top" }
    ),
  ],
  {
    name: "AI Assistant Chat Preview",
    description: "Mock chat UI of Mash AI answering live trading questions",
    category: "ai-features",
    slug: "ai-features-ai-assistant-chat-preview",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
