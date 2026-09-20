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

const strategyCard = (
  icon: string,
  name: string,
  tagline: string,
  description: string,
  stats: { label: string; value: string }[],
  cta: string
): Element =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 20,
      padding: 36,
      boxShadowX: 0,
      boxShadowY: 10,
      boxShadowBlur: 32,
      boxShadowSpread: -8,
      boxShadowColor: "rgba(10,18,32,0.06)",
    },
    [
      el.icon(icon, { size: 40, color: theme.primary, marginBottom: 20 }),
      el.heading(name, {
        level: "h3",
        fontSize: 26,
        fontWeight: "800",
        letterSpacing: "-0.02em",
        marginBottom: 6,
      }),
      el.text(tagline, {
        fontSize: 13,
        fontWeight: "700",
        color: theme.emerald,
        letterSpacing: "0.12em",
        marginBottom: 14,
      }),
      el.text(description, {
        fontSize: 15,
        color: theme.textMuted,
        lineHeight: "1.6",
        marginBottom: 24,
      }),
      el.divider({ marginTop: 0, marginBottom: 20 }),
      ...stats.flatMap((s) => [
        el.text(s.label, {
          fontSize: 12,
          fontWeight: "600",
          color: theme.textDim,
          letterSpacing: "0.1em",
          marginBottom: 2,
        }),
        el.text(s.value, {
          fontSize: 18,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 14,
        }),
      ]),
      el.button(cta, "/bots", {
        width: "100%",
        fontSize: 15,
        marginRight: 0,
        marginTop: 8,
      }),
    ]
  );

export const tradingBotStrategiesShowcase: Section = section(
  [
    singleColumnRow([
      el.text("AUTOMATED TRADING", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("Strategies that run while you sleep", {
        textAlign: "center",
        fontSize: 46,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "Three battle-tested bot frameworks, deployable in minutes. Backtested on 5+ years of tick data.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "680px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(33.33, [
          strategyCard(
            "lucide:repeat",
            "DCA Bot",
            "STEADY ACCUMULATION",
            "Dollar-cost averaging with intelligent dip detection. Ladder your entries across any timeframe.",
            [
              { label: "AVG ANNUAL RETURN", value: "+34.2%" },
              { label: "MAX DRAWDOWN", value: "-12.8%" },
              { label: "ACTIVE USERS", value: "48,210" },
            ],
            "Deploy DCA strategy"
          ),
        ]),
        col(33.33, [
          strategyCard(
            "lucide:grid-3x3",
            "Grid Bot",
            "RANGE-BOUND PROFITS",
            "Automatic buy-low / sell-high within a price range. Compounds volatility into consistent returns.",
            [
              { label: "AVG ANNUAL RETURN", value: "+42.8%" },
              { label: "MAX DRAWDOWN", value: "-18.4%" },
              { label: "ACTIVE USERS", value: "31,540" },
            ],
            "Deploy Grid strategy"
          ),
        ]),
        col(33.33, [
          strategyCard(
            "lucide:trending-up",
            "Martingale",
            "AGGRESSIVE RECOVERY",
            "Progressive position sizing with hard safety rails. For advanced traders comfortable with leverage.",
            [
              { label: "AVG ANNUAL RETURN", value: "+61.4%" },
              { label: "MAX DRAWDOWN", value: "-28.6%" },
              { label: "ACTIVE USERS", value: "12,108" },
            ],
            "Deploy Martingale"
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Bot Strategies Showcase",
    description: "Three automated trading strategy cards with performance stats",
    category: "trading",
    slug: "trading-bot-strategies-showcase",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
