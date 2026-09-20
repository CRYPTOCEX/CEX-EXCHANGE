import type { Section, Row } from "@/types/builder";
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

/**
 * Impact pills. These are raw HTML, so they take REAL css, not class
 * fragments — and the label is 10px, which needs 4.5:1. The old soft
 * accent tints could not deliver that (a status hue over a near-white
 * surface tops out around 3.1:1), and the token vocabulary has no tinted
 * ground for status hues anyway. High/medium therefore become solid
 * `band*` chips with pinned `onBand` ink (7.5:1 / 7.7:1); "low" is a
 * quiet neutral surface chip, which also reads as the right severity.
 */
const impactBadge = (impact: "high" | "medium" | "low") => {
  const colors = {
    high: { bg: theme.bandDestructive, border: theme.bandDestructive, text: theme.onBand, label: "HIGH IMPACT" },
    medium: { bg: theme.bandWarning, border: theme.bandWarning, text: theme.onBand, label: "MEDIUM" },
    low: { bg: theme.cssSurface3, border: theme.cssBorder, text: theme.cssMutedInk, label: "LOW" },
  }[impact];
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${colors.bg};border:1px solid ${colors.border};color:${colors.text};font-size:10px;font-weight:800;letter-spacing:0.1em;">${colors.label}</span>`;
};

const eventRow = (
  date: string,
  time: string,
  flag: string,
  currency: string,
  event: string,
  forecast: string,
  previous: string,
  impact: "high" | "medium" | "low"
): Row =>
  row(
    [
      col(14, [
        el.text(date, {
          fontSize: 14,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 2,
        }),
        el.text(time + " UTC", {
          fontSize: 12,
          color: theme.textDim,
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ]),
      col(10, [
        el.text(`<span style="font-size:22px;">${flag}</span> <strong>${currency}</strong>`, {
          fontSize: 14,
          color: theme.text,
          marginBottom: 0,
        }),
      ]),
      col(38, [
        el.text(event, {
          fontSize: 15,
          fontWeight: "600",
          color: theme.text,
          marginBottom: 4,
        }),
        el.text(impactBadge(impact), { marginBottom: 0 }),
      ]),
      col(19, [
        el.text("FORECAST", {
          fontSize: 10,
          fontWeight: "700",
          color: theme.textDim,
          letterSpacing: "0.12em",
          marginBottom: 2,
          textAlign: "right",
        }),
        el.text(forecast, {
          fontSize: 14,
          fontWeight: "600",
          color: theme.primary,
          textAlign: "right",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ]),
      col(19, [
        el.text("PREVIOUS", {
          fontSize: 10,
          fontWeight: "700",
          color: theme.textDim,
          letterSpacing: "0.12em",
          marginBottom: 2,
          textAlign: "right",
        }),
        el.text(previous, {
          fontSize: 14,
          color: theme.textMuted,
          textAlign: "right",
          marginBottom: 0,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }),
      ]),
    ],
    {
      ...rowPresets.wide,
      gutter: 16,
      paddingTop: 18,
      paddingBottom: 18,
      borderBottom: true,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: theme.border,
      verticalAlign: "middle",
    }
  );

export const forexFuturesEconomicCalendar: Section = section(
  [
    singleColumnRow([
      el.text("THIS WEEK'S EVENTS", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      el.heading("Never trade into a surprise", {
        textAlign: "center",
        fontSize: 44,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "High-impact economic releases move markets instantly. Our calendar flags NFP, CPI, FOMC, and central-bank decisions in real time.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "680px",
          marginBottom: 48,
        }
      ),
    ]),
    eventRow("Apr 28", "12:30", "🇺🇸", "USD", "Core PCE Price Index (MoM)", "0.3%", "0.3%", "high"),
    eventRow("Apr 30", "09:00", "🇪🇺", "EUR", "Eurozone GDP Flash (QoQ)", "+0.2%", "0.0%", "high"),
    eventRow("May 01", "18:00", "🇺🇸", "USD", "FOMC Interest Rate Decision", "5.50%", "5.50%", "high"),
    eventRow("May 02", "11:00", "🇬🇧", "GBP", "BoE Interest Rate Decision", "5.25%", "5.25%", "high"),
    eventRow("May 03", "12:30", "🇺🇸", "USD", "Non-Farm Payrolls", "+240K", "+303K", "high"),
    eventRow("May 03", "12:30", "🇺🇸", "USD", "Unemployment Rate", "3.8%", "3.8%", "medium"),
    eventRow("May 06", "01:30", "🇦🇺", "AUD", "RBA Interest Rate Decision", "4.35%", "4.35%", "medium"),
    singleColumnRow(
      [
        el.button("View full calendar", "/calendar", {
          fontSize: 15,
          marginTop: 32,
          marginRight: 0,
        }),
      ],
      { ...rowPresets.narrow, textAlign: "center" }
    ),
  ],
  {
    name: "Economic Calendar",
    description: "Upcoming economic events with forecast, previous, and impact ratings",
    category: "forex-futures",
    slug: "forex-futures-economic-calendar",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
