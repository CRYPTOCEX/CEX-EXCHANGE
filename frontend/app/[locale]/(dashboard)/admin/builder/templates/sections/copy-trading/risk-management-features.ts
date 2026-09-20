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

const riskFeature = (
  icon: string,
  title: string,
  description: string,
  accent: string
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
          /* This used to build a per-accent tint by appending hex alpha
             (`accent.light + "1a"`). `accent` is now a Tailwind arbitrary-value
             fragment, so there is nothing to append to — and a fragment derived
             at runtime could never work anyway, because Tailwind only compiles
             classes it has SEEN in source. Deriving one per accent would need a
             matching safelist entry for every combination.
             One shared soft ground instead; the four features are peers and the
             icon still carries the accent. */
          backgroundColor: theme.primarySoft,
          borderWidth: 0,
          borderRadius: 12,
          padding: 12,
          marginBottom: 20,
          width: "56px",
          height: "56px",
        },
        [
          el.icon(icon, { size: 32, color: accent, marginBottom: 0 }),
        ]
      ),
      el.heading(title, {
        level: "h3",
        fontSize: 20,
        fontWeight: "800",
        color: theme.text,
        letterSpacing: "-0.01em",
        marginBottom: 10,
      }),
      el.text(description, {
        fontSize: 14,
        color: theme.textMuted,
        lineHeight: "1.65",
        marginBottom: 0,
      }),
    ]
  );

export const copyTradingRiskManagementFeatures: Section = section(
  [
    singleColumnRow([
      el.text("RISK CONTROLS", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("You're always in control of your capital", {
        textAlign: "center",
        fontSize: 46,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "Copy trading doesn't mean surrendering control. Configure hard limits that trigger automatically — no matter what the trader you follow does.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "720px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(25, [
          riskFeature(
            "lucide:shield-alert",
            "Personal stop-loss",
            "Set a hard USD or percentage drawdown. Your copy halts automatically if hit — no questions asked.",
            theme.rose
          ),
        ]),
        col(25, [
          riskFeature(
            "lucide:percent",
            "Per-trade risk cap",
            "Cap position size at a fixed % of your allocation. Prevents outsized bets, even if the master trader goes YOLO.",
            theme.amber
          ),
        ]),
        col(25, [
          riskFeature(
            "lucide:filter",
            "Asset filters",
            "Whitelist or blacklist specific symbols. Copy only the BTC trades, skip the meme-coins — you choose.",
            theme.sky
          ),
        ]),
        col(25, [
          riskFeature(
            "lucide:pause-circle",
            "Auto-pause rules",
            "Pause copying automatically on high-volatility news, VIX spikes, or custom indicator triggers.",
            theme.emerald
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Risk Management Features",
    description: "Four-column risk controls: stop-loss, risk cap, asset filters, auto-pause",
    category: "copy-trading",
    slug: "copy-trading-risk-management-features",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
