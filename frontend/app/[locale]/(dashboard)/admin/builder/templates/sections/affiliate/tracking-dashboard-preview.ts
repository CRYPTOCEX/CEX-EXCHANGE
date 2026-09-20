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

const miniStat = (
  label: string,
  value: string,
  delta: string,
  accent: string
) =>
  col(
    100,
    [
      el.text(label, {
        fontSize: 11,
        fontWeight: "700",
        color: theme.textDim,
        letterSpacing: "0.15em",
        marginBottom: 10,
      }),
      el.heading(value, {
        level: "h4",
        fontSize: 28,
        fontWeight: "800",
        color: theme.text,
        marginBottom: 6,
        letterSpacing: "-0.02em",
      }),
      el.text(delta, {
        fontSize: 12,
        fontWeight: "600",
        color: accent,
        marginBottom: 0,
      }),
    ],
    {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      borderRadius: 14,
      paddingTop: 22,
      paddingBottom: 22,
      paddingLeft: 20,
      paddingRight: 20,
    }
  );

export const affiliateTrackingDashboardPreview: Section = section(
  [
    row(
      [
        col(45, [
          el.text("REAL-TIME TRACKING", {
            fontSize: 12,
            fontWeight: "800",
            color: theme.primary,
            letterSpacing: "0.22em",
            marginBottom: 16,
          }),
          el.heading("A dashboard built for creators, not accountants", {
            level: "h2",
            fontSize: 42,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 20,
            letterSpacing: "-0.025em",
            lineHeight: "1.1",
          }),
          el.text(
            "Every click, sign-up, deposit, and trade is tracked in real time. Drill into campaigns, channels, and geos — then export everything as CSV.",
            {
              fontSize: 17,
              color: theme.textMuted,
              marginBottom: 28,
              lineHeight: "1.65",
            }
          ),
          el.list(
            [
              "Sub-ID tracking for unlimited campaigns",
              "90-day cookie attribution window",
              "Conversion data in under 60 seconds",
              "Webhook + API export for your own stack",
            ],
            {
              fontSize: 15,
              color: theme.text,
              marginBottom: 32,
              listStyle: "check",
            }
          ),
          el.button("See live demo", "/affiliate/demo", {
            backgroundColor: theme.cssPrimary,
            color: theme.cssPrimaryInk,
            marginRight: 0,
          }),
        ]),
        col(55, [
          row(
            [
              miniStat("Clicks (30d)", "48,214", "+12.4% vs prev", theme.emerald),
              miniStat("Sign-ups", "2,108", "+8.7% vs prev", theme.emerald),
            ],
            { gutter: 16, maxWidth: "100%", paddingTop: 0, paddingBottom: 0, marginBottom: 16 }
          ) as any,
          row(
            [
              miniStat("Conversion rate", "4.37%", "+0.3 pts", theme.sky),
              miniStat("Earnings MTD", "$14,820", "+21% vs prev", theme.emerald),
            ],
            { gutter: 16, maxWidth: "100%", paddingTop: 0, paddingBottom: 0, marginBottom: 16 }
          ) as any,
          el.image(
            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=85",
            "Screenshot of analytics dashboard showing conversion charts",
            {
              borderRadius: 16,
              width: "100%",
              height: "auto",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: theme.border,
              marginBottom: 0,
            }
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 40, verticalAlign: "top" }
    ),
  ],
  {
    name: "Tracking Dashboard Preview",
    description: "Split layout with affiliate dashboard KPIs and chart preview",
    category: "affiliate",
    slug: "affiliate-tracking-dashboard-preview",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
