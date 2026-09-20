"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Row 1 — what a visitor is seeing right now, and whether any of it
    // is broken.
    //
    // `status` is a tinyint(1); the three cards this row replaces all
    // compared it against the STRING 'true', which MySQL coerces to 0 —
    // so "Active Announcements" was the count of the hidden ones. These
    // are snapshots, because a banner published last year is still on
    // the site today — which is exactly the failure mode the two age
    // tiles catch. Nothing expires a banner; somebody has to notice.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi" as const,
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 2, span: 2 },
        },
        items: [
          {
            id: "live_announcements",
            title: tDashboardAdmin("active_announcements"),
            metric: "liveNow",
            model: "announcement",
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "status", value: "true" }],
            },
            valueMode: "current",
            format: "number",
            icon: "Megaphone",
          },
          {
            id: "oldest_live_announcement",
            title: tDashboardAdmin("oldest_live_announcement"),
            metric: "oldestLiveAge",
            model: "announcement",
            // MAX(TIMESTAMPDIFF(HOUR, createdAt, NOW())) over the published
            // set. There is no expiry column on this table, so the only thing
            // standing between a stale "Scheduled maintenance tonight" banner
            // and the homepage is somebody reading this number.
            //
            // Hours because `format: "duration"` reads its input as hours and
            // rolls up to days past 48 by itself.
            aggregation: {
              field: "createdAt",
              op: "max",
              since: { unit: "h" },
              where: [{ field: "status", value: "true" }],
            },
            valueMode: "current",
            format: "duration",
            invert: true,
            icon: "Hourglass",
          },
          {
            id: "stale_live_announcements",
            title: tDashboardAdmin("live_and_older_than_90_days"),
            metric: "staleLive",
            model: "announcement",
            // The worklist behind the tile above: how many of them, not just
            // how old the worst one is.
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "status", value: "true" },
                { field: "createdAt", op: "<", value: { ago: "90d" } },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "CalendarClock",
          },
          {
            id: "hidden_announcements",
            title: tDashboardAdmin("inactive_announcements"),
            metric: "hiddenNow",
            model: "announcement",
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
            id: "live_without_link",
            title: tDashboardAdmin("live_without_a_link"),
            metric: "liveWithoutLink",
            model: "announcement",
            // A dead-end banner wastes the slot. `link` is nullable by design,
            // so this is a real editorial worklist.
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
            id: "published_this_period",
            title: tCommon("published_this_period"),
            metric: "publishedInPeriod",
            model: "announcement",
            // Not the built-in `total`: the snapshot pass behind the three
            // `current` cards above also republishes `total` as the all-time
            // row count, which would turn this into a fourth lifetime tile.
            aggregation: { op: "count", field: "id" },
            valueMode: "periodTotal",
            format: "number",
            icon: "Plus",
          },
        ],
      },
      {
        type: "chart" as const,
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 1, span: 2 },
          desktop: { cols: 1, span: 1 },
        },
        items: [
          {
            id: "announcementTypeDistribution",
            title: tDashboardAdmin("announcement_type_distribution"),
            type: "pie" as const,
            model: "announcement",
            metrics: ["GENERAL", "EVENT", "UPDATE"],
            config: {
              field: "type",
              status: [
                {
                  value: "GENERAL",
                  label: tCommon("general"),
                  color: "blue",
                  icon: "mdi:information",
                },
                {
                  value: "EVENT",
                  label: tCommon("event"),
                  color: "green",
                  icon: "mdi:calendar",
                },
                {
                  value: "UPDATE",
                  label: tCommon("update"),
                  color: "amber",
                  icon: "mdi:update",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 2 — publishing cadence. One stacked bar, not four lines: this
    // table takes a handful of rows a month and four series of that
    // volume render as four flat lines on the axis.
    // ─────────────────────────────────────────────────────────────
    {
      type: "chart" as const,
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 1, span: 1 },
        desktop: { cols: 1, span: 1 },
      },
      items: [
        {
          id: "announcementsPublishedOverTime",
          title: tDashboardAdmin("announcements_over_time"),
          description: tDashboardAdmin("announcements_published_per_bucket_by_type"),
          type: "stackedBar" as const,
          model: "announcement",
          metrics: ["GENERAL", "EVENT", "UPDATE"],
          timeframes: ["7d", "30d", "3m", "6m", "y"],
          labels: {
            GENERAL: tCommon("general"),
            EVENT: tCommon("event"),
            UPDATE: tCommon("update"),
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
