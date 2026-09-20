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

const toolCard = (
  icon: string,
  title: string,
  body: string,
  stat: string,
  statLabel: string,
  accent: string
) =>
  col(
    50,
    [
      row(
        [
          col(
            20,
            [el.icon(icon, { size: 26, color: accent, marginBottom: 0 })],
            {
              // Was a pinned `--chart-4`-at-14% tint, frozen at its light-mode
              // RGB. One shared soft brand ground instead — it is the only soft
              // tint with a safelisted class fragment, and the four cards each
              // keep their own accent on the icon, the stat and the link.
              backgroundColor: theme.primarySoft,
              borderRadius: 14,
              width: "56px",
              maxWidth: "56px",
              height: "56px",
              paddingTop: 15,
              paddingBottom: 15,
              paddingLeft: 0,
              paddingRight: 0,
              textAlign: "center",
            }
          ),
          col(80, [
            el.heading(title, {
              level: "h3",
              fontSize: 20,
              fontWeight: "700",
              color: theme.text,
              marginBottom: 8,
              letterSpacing: "-0.01em",
            }),
            el.text(body, {
              fontSize: 14,
              color: theme.textMuted,
              lineHeight: "1.65",
              marginBottom: 0,
            }),
          ]),
        ],
        { gutter: 16, maxWidth: "100%", paddingTop: 0, paddingBottom: 0, marginBottom: 24, verticalAlign: "top" }
      ) as any,
      el.divider({ marginTop: 0, marginBottom: 16 }),
      row(
        [
          col(60, [
            el.heading(stat, {
              level: "h4",
              fontSize: 28,
              fontWeight: "800",
              color: accent,
              letterSpacing: "-0.02em",
              marginBottom: 2,
            }),
            el.text(statLabel, {
              fontSize: 12,
              color: theme.textDim,
              letterSpacing: "0.08em",
              marginBottom: 0,
            }),
          ]),
          col(40, [
            el.link("Learn more →", "#", {
              fontSize: 13,
              fontWeight: "600",
              color: accent,
            }),
          ], { textAlign: "right", verticalAlign: "middle" }),
        ],
        { gutter: 12, maxWidth: "100%", paddingTop: 0, paddingBottom: 0, verticalAlign: "middle" }
      ) as any,
    ],
    {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      borderRadius: 20,
      paddingTop: 28,
      paddingBottom: 28,
      paddingLeft: 28,
      paddingRight: 28,
    }
  );

export const aiFeaturesPredictiveAnalyticsGrid: Section = section(
  [
    singleColumnRow([
      el.text("PREDICTIVE ANALYTICS", {
        fontSize: 12,
        fontWeight: "800",
        color: theme.violet,
        letterSpacing: "0.22em",
        textAlign: "center",
        marginBottom: 16,
      }),
      el.heading("Four AI tools, one intelligence layer", {
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
        "Mash AI models are trained on 14 years of market history and re-calibrated every 6 hours against live conditions.",
        {
          fontSize: 18,
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "660px",
          marginBottom: 56,
          lineHeight: "1.6",
        }
      ),
    ]),
    row(
      [
        toolCard(
          "lucide:line-chart",
          "Price prediction",
          "Short-horizon (4h to 7d) price-path forecasts with confidence bands.",
          "94%",
          "DIRECTIONAL ACCURACY · 7D",
          theme.emerald
        ),
        toolCard(
          "lucide:shield-alert",
          "Risk analyzer",
          "Portfolio-level drawdown, VaR, and correlation heatmaps in real time.",
          "$48M",
          "RISK ASSESSED DAILY",
          theme.rose
        ),
      ],
      { ...rowPresets.wide, gutter: 24, marginBottom: 24, verticalAlign: "top" }
    ),
    row(
      [
        toolCard(
          "lucide:brain-circuit",
          "Sentiment analysis",
          "News, social, and Discord chatter scored into one tradable sentiment index.",
          "12k",
          "SOURCES SCANNED / DAY",
          theme.sky
        ),
        toolCard(
          "lucide:scan-search",
          "Pattern detection",
          "Flags head-and-shoulders, cup-and-handle, Wyckoff setups the moment they print.",
          "48",
          "PATTERNS TRACKED",
          theme.amber
        ),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
  ],
  {
    name: "Predictive Analytics Grid",
    description: "2×2 grid of AI predictive tools with headline stats",
    category: "ai-features",
    slug: "ai-features-predictive-analytics-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
