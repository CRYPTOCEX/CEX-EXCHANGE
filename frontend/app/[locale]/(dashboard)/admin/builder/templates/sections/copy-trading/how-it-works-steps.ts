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

const step = (
  num: string,
  icon: string,
  title: string,
  description: string
): Element =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 18,
      padding: 32,
    },
    [
      el.card(
        {
          backgroundColor: theme.primary,
          borderWidth: 0,
          borderRadius: 999,
          padding: 0,
          marginBottom: 20,
          width: "40px",
          height: "40px",
        },
        [
          el.text(num, {
            fontSize: 16,
            fontWeight: "800",
            color: theme.primaryText,
            textAlign: "center",
            marginBottom: 0,
            lineHeight: "40px",
          }),
        ]
      ),
      el.icon(icon, { size: 36, color: theme.primary, marginBottom: 16 }),
      el.heading(title, {
        level: "h3",
        fontSize: 20,
        fontWeight: "800",
        color: theme.text,
        letterSpacing: "-0.01em",
        marginBottom: 8,
      }),
      el.text(description, {
        fontSize: 14,
        color: theme.textMuted,
        lineHeight: "1.6",
        marginBottom: 0,
      }),
    ]
  );

export const copyTradingHowItWorksSteps: Section = section(
  [
    singleColumnRow([
      el.text("COPY TRADING · 4 STEPS", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("Mirror a pro's portfolio in 60 seconds", {
        textAlign: "center",
        fontSize: 46,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "No strategy-building, no screen-watching. Pick a trader, allocate capital, and every trade they place runs in your account automatically.",
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
        col(25, [
          step(
            "01",
            "lucide:search",
            "Browse",
            "Sort 4,200+ verified traders by ROI, risk score, Sharpe ratio, or asset mix. Every stat is audited live."
          ),
        ]),
        col(25, [
          step(
            "02",
            "lucide:user-check",
            "Select",
            "Inspect each trader's full trading history, drawdowns, and preferred instruments before you commit."
          ),
        ]),
        col(25, [
          step(
            "03",
            "lucide:copy",
            "Copy",
            "Allocate as little as $100. Set stop-loss rules and a per-trade cap. Start copying instantly."
          ),
        ]),
        col(25, [
          step(
            "04",
            "lucide:trending-up",
            "Earn",
            "Profits land in your account tick-by-tick. Pause, adjust, or switch traders at any time."
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "How It Works Steps",
    description: "Four-step horizontal flow: Browse, Select, Copy, Earn",
    category: "copy-trading",
    slug: "copy-trading-how-it-works-steps",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
