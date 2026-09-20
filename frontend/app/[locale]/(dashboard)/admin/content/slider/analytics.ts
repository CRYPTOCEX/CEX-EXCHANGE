"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  return [
    // ─────────────────────────────────────────────────────────────
    // A homepage carousel is six columns and single-digit rows. It has
    // no time dimension worth plotting — creation dates only record when
    // somebody last redesigned the landing page — and its one
    // categorical column is a boolean, so a donut of it is the lowest
    // information density on the platform. What is left is six facts,
    // all of them snapshots: what is live, what is dormant, how much of
    // the live set is clickable, and how long it has been since anybody
    // touched the thing at all.
    //
    // The cards this replaces were four `status = 'true'` boolean
    // miscompares (tinyint(1) against a string coerces to `= 0`, so
    // "Active Sliders" counted the DISABLED ones) plus a creation line
    // that is flat zero on every timeframe. `Total Sliders` went with
    // them: it is live + hidden, and the page has no third state.
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi" as const,
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 2, span: 1 },
        desktop: { cols: 3, span: 1 },
      },
      items: [
        {
          id: "active_sliders",
          title: t("active_sliders"),
          metric: "liveSlides",
          model: "slider",
          aggregation: {
            op: "count",
            field: "id",
            where: [{ field: "status", value: "true" }],
          },
          valueMode: "current",
          format: "number",
          icon: "Images",
        },
        {
          id: "inactive_sliders",
          title: t("inactive_sliders"),
          metric: "hiddenSlides",
          model: "slider",
          aggregation: {
            op: "count",
            field: "id",
            where: [{ field: "status", value: "false" }],
          },
          valueMode: "current",
          format: "number",
          icon: "EyeOff",
        },
        {
          id: "time_since_last_change",
          title: t("since_the_carousel_last_changed"),
          metric: "sinceLastEdit",
          model: "slider",
          // MIN(TIMESTAMPDIFF(HOUR, updatedAt, NOW())) — the SMALLEST elapsed
          // time is the MOST RECENT edit, so `min` is the right operator here
          // even though the card reads as "the newest thing on the page".
          //
          // A carousel that has not been touched in a year is usually a
          // forgotten campaign still occupying the homepage, and this is the
          // only staleness signal a six-column table can give.
          aggregation: {
            field: "updatedAt",
            op: "min",
            since: { unit: "h" },
          },
          valueMode: "current",
          format: "duration",
          invert: true,
          icon: "History",
        },
        {
          id: "active_sliders_with_link",
          title: t("active_with_a_link"),
          metric: "liveWithLink",
          model: "slider",
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "status", value: "true" },
              { field: "link", value: null, negate: true },
            ],
          },
          valueMode: "current",
          format: "number",
          icon: "Link",
        },
        {
          id: "active_sliders_without_link",
          title: t("active_without_a_link"),
          metric: "liveWithoutLink",
          model: "slider",
          // A slide nobody can click is wasted homepage real estate, and
          // `link` is explicitly nullable — this is the only quality check
          // the model can support.
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "status", value: "true" },
              { field: "link", value: null },
            ],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "AlertTriangle",
        },
        {
          id: "link_coverage",
          title: t("link_coverage"),
          metric: "linkCoverage",
          model: "slider",
          // The one ratio that answers "is the carousel actually doing any
          // work". Free — it is arithmetic over two aliases already on the
          // page, not another query.
          derived: { op: "percent", of: ["liveWithLink", "liveSlides"] },
          format: "percent",
          icon: "Percent",
        },
      ],
    },
  ] as AnalyticsConfig;
}
