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

type Signal = {
  name: string;
  icon: string;
  subtitle: string;
  accuracy: string;
  body: string;
  accent: string;
};

/**
 * The icon tiles used to carry a per-signal tint pinned at the light-mode RGB
 * of `--success` / `--destructive` / `--info` at 12% alpha. A per-accent
 * theme-following tint would need its own safelist entry per hue (Tailwind only
 * compiles classes it has seen), so all three share `theme.primarySoft` and the
 * bull / bear / sideways reading is carried by the accent on the icon, the
 * eyebrow and the headline figure — which is where R2 wants it anyway.
 */
const signals: Signal[] = [
  {
    name: "Bull",
    icon: "lucide:trending-up",
    subtitle: "Long-bias setups",
    accuracy: "94%",
    body: "Momentum + volume breakouts with a 7-day hold window. Filtered for trend strength and on-chain confirmation.",
    accent: theme.emerald,
  },
  {
    name: "Bear",
    icon: "lucide:trending-down",
    subtitle: "Short-bias setups",
    accuracy: "89%",
    body: "Exhaustion patterns, divergence flags, and distribution signals. Ideal for hedges, not panic exits.",
    accent: theme.rose,
  },
  {
    name: "Sideways",
    icon: "lucide:move-horizontal",
    subtitle: "Range-bound setups",
    accuracy: "91%",
    body: "Mean-reversion plays inside well-defined channels. Works best with options selling and grid strategies.",
    accent: theme.sky,
  },
];

const signalCard = (s: Signal) =>
  col(
    100,
    [
      col(
        100,
        [el.icon(s.icon, { size: 28, color: s.accent, marginBottom: 0 })],
        {
          backgroundColor: theme.primarySoft,
          borderRadius: 14,
          width: "56px",
          maxWidth: "56px",
          height: "56px",
          paddingTop: 14,
          paddingBottom: 14,
          paddingLeft: 0,
          paddingRight: 0,
          textAlign: "center",
          marginBottom: 24,
        }
      ) as any,
      el.text(s.subtitle.toUpperCase(), {
        fontSize: 11,
        fontWeight: "800",
        color: s.accent,
        letterSpacing: "0.2em",
        marginBottom: 8,
      }),
      el.heading(`${s.name} signals`, {
        level: "h3",
        fontSize: 24,
        fontWeight: "800",
        color: theme.text,
        marginBottom: 16,
        letterSpacing: "-0.02em",
      }),
      el.heading(s.accuracy, {
        level: "h4",
        fontSize: 44,
        fontWeight: "800",
        color: s.accent,
        marginBottom: 4,
        letterSpacing: "-0.02em",
      }),
      el.text("accuracy on 7d hold", {
        fontSize: 12,
        color: theme.textDim,
        letterSpacing: "0.08em",
        marginBottom: 20,
      }),
      el.divider({ marginTop: 0, marginBottom: 20 }),
      el.text(s.body, {
        fontSize: 14,
        color: theme.textMuted,
        lineHeight: "1.65",
        marginBottom: 0,
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
  );

export const aiFeaturesSmartTradingSignals: Section = section(
  [
    singleColumnRow([
      el.text("MASH AI · TRADING SIGNALS", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.violet,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("Three signal types. One engine.", {
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
        "Mash AI monitors 400+ pairs across every market regime. Signals are backtested daily and scored against a rolling 18-month window.",
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
    row(signals.map(signalCard), {
      ...rowPresets.wide,
      gutter: 24,
      verticalAlign: "top",
    }),
  ],
  {
    name: "Smart Trading Signals",
    description: "3-tier signal cards (Bull / Bear / Sideways) with accuracy stats",
    category: "ai-features",
    slug: "ai-features-smart-trading-signals",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
