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

const benefitTile = (
  icon: string,
  title: string,
  body: string,
  accent: string
) =>
  col(100, [
    el.icon(icon, { size: 26, color: accent, marginBottom: 14 }),
    el.heading(title, {
      level: "h4",
      fontSize: 17,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 8,
    }),
    el.text(body, {
      fontSize: 14,
      color: theme.textMuted,
      lineHeight: "1.6",
      marginBottom: 0,
    }),
  ]);

export const aiFeaturesAutomatedReports: Section = section(
  [
    row(
      [
        col(
          55,
          [
            (row(
              [
                col(50, [
                  el.image(
                    "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&q=85",
                    "Screenshot of analytics report with charts and KPIs",
                    {
                      borderRadius: 14,
                      width: "100%",
                      height: "auto",
                      marginBottom: 0,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: theme.border,
                    }
                  ),
                ]),
                col(50, [
                  el.image(
                    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&q=85",
                    "Screenshot of portfolio performance report",
                    {
                      borderRadius: 14,
                      width: "100%",
                      height: "auto",
                      marginBottom: 16,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: theme.border,
                    }
                  ),
                  el.image(
                    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=85",
                    "Screenshot of risk analysis dashboard",
                    {
                      borderRadius: 14,
                      width: "100%",
                      height: "auto",
                      marginBottom: 0,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: theme.border,
                    }
                  ),
                ]),
              ],
              { gutter: 16, maxWidth: "100%", paddingTop: 0, paddingBottom: 0, verticalAlign: "top" }
            )) as any,
          ]
        ),
        col(45, [
          el.text("AUTOMATED REPORTS", {
            fontSize: 12,
            fontWeight: "800",
            color: theme.primary,
            letterSpacing: "0.22em",
            marginBottom: 16,
          }),
          el.heading("Monday-morning reports, delivered automatically", {
            level: "h2",
            fontSize: 40,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 20,
            letterSpacing: "-0.025em",
            lineHeight: "1.1",
          }),
          el.text(
            "Mash AI compiles trading performance, tax summaries, P&L by asset, and risk exposure into branded PDFs. Set a cadence once — forever off your to-do list.",
            {
              fontSize: 17,
              color: theme.textMuted,
              marginBottom: 32,
              lineHeight: "1.65",
            }
          ),
          row(
            [
              benefitTile(
                "lucide:calendar-clock",
                "Scheduled delivery",
                "Daily, weekly, or monthly — sent to your inbox or a Slack channel.",
                theme.emerald
              ),
              benefitTile(
                "lucide:file-spreadsheet",
                "Tax-ready",
                "IRS 8949, UK HMRC CGT, and 14 other jurisdictions, prepared automatically.",
                theme.amber
              ),
            ],
            { gutter: 24, maxWidth: "100%", paddingTop: 0, paddingBottom: 0, marginBottom: 24 }
          ) as any,
          row(
            [
              benefitTile(
                "lucide:pie-chart",
                "Portfolio breakdowns",
                "Asset allocation, sector exposure, and benchmark comparison.",
                theme.sky
              ),
              benefitTile(
                "lucide:share-2",
                "Team sharing",
                "Share read-only report links with co-investors or your accountant.",
                theme.violet
              ),
            ],
            { gutter: 24, maxWidth: "100%", paddingTop: 0, paddingBottom: 0, marginBottom: 32 }
          ) as any,
          el.button("See a sample report", "/ai/reports/sample", {
            backgroundColor: theme.cssPrimary,
            color: theme.cssPrimaryInk,
            marginRight: 12,
          }),
          el.button("Set up reports", "/ai/reports", {
            backgroundColor: theme.cssSurface3,
            color: theme.cssForeground,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border,
            marginRight: 0,
          }),
        ]),
      ],
      { ...rowPresets.wide, gutter: 48, verticalAlign: "middle" }
    ),
  ],
  {
    name: "Automated Reports",
    description: "Split layout with sample report screenshots and benefit grid",
    category: "ai-features",
    slug: "ai-features-automated-reports",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
