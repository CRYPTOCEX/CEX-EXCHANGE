"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  // NOTE: this page runs against Scylla (`db="scylla"`, keyspace "ecosystem"),
  // whose aggregator only understands "count rows where column = literal".
  // No sums, averages, distinct counts, snapshots or derived ratios are
  // available here, so every figure below is a row count by design.
  // The cancel status literal is CANCELED (one L) — that is what the matching
  // engine writes (scylla/queries.ts); CANCELLED matches nothing.
  return [
    // ─────────────────────────────────────────────────────────────
    // Section 1 — Book state: what is resting, what matched, what was pulled.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 4, rows: 1 },
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 4, span: 2 },
        },
        items: [
          {
            id: "total_orders",
            title: tCommon("total_orders"),
            metric: "total",
            model: "orders",
            icon: "mdi:format-list-bulleted",
          },
          {
            id: "resting_orders",
            title: tCommon("open_orders"),
            metric: "OPEN",
            model: "orders",
            aggregation: { field: "status", value: "OPEN" },
            icon: "mdi:book-open-variant",
          },
          {
            id: "matched_orders",
            title: t("matched_orders"),
            metric: "CLOSED",
            model: "orders",
            aggregation: { field: "status", value: "CLOSED" },
            icon: "mdi:check-circle",
          },
          {
            id: "canceled_orders",
            title: t("canceled_orders"),
            metric: "CANCELED",
            model: "orders",
            aggregation: { field: "status", value: "CANCELED" },
            invert: true,
            icon: "mdi:close-circle",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, span: 1, order: 2 },
          tablet: { cols: 1, span: 1 },
          desktop: { cols: 1, span: 1 },
        },
        items: [
          {
            id: "orderStatusDistribution",
            title: tCommon("order_status_distribution"),
            type: "pie",
            model: "orders",
            metrics: ["OPEN", "CLOSED", "CANCELED"],
            config: {
              field: "status",
              status: [
                {
                  value: "OPEN",
                  label: tCommon("open"),
                  color: "blue",
                  icon: "mdi:book-open-variant",
                },
                {
                  value: "CLOSED",
                  label: tCommon("closed"),
                  color: "green",
                  icon: "mdi:check-circle",
                },
                {
                  value: "CANCELED",
                  label: t("canceled"),
                  color: "red",
                  icon: "mdi:close-circle",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Section 2 — The same three states as a trend, stacked, so the
    // cancel band reads as a share of flow instead of a line hidden
    // under `total`. Replaces the old total-dominated line chart.
    // ─────────────────────────────────────────────────────────────
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 1, span: 1 },
        desktop: { cols: 1, span: 1 },
      },
      items: [
        {
          // Read the cancel band as a SHARE of flow: when it grows on a single
          // market it is almost always a tick- or lot-size misconfiguration
          // rejecting otherwise valid orders.
          id: "orderOutcomeOverTime",
          title: tCommon("orders_over_time"),
          type: "stackedBar",
          model: "orders",
          metrics: ["OPEN", "CLOSED", "CANCELED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            OPEN: tCommon("open"),
            CLOSED: tCommon("closed"),
            CANCELED: t("canceled"),
          },
          description: t("order_outcome_mix_per_bucket"),
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Section 3 — Liquidity composition. LIMIT orders provide the book,
    // MARKET orders consume it; the ratio is the internal venue's health.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 2, rows: 1 },
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 2, span: 2 },
        },
        items: [
          {
            id: "limit_orders",
            title: t("limit_orders"),
            metric: "LIMIT",
            model: "orders",
            aggregation: { field: "type", value: "LIMIT" },
            icon: "mdi:chart-bell-curve",
          },
          {
            id: "market_orders",
            title: t("market_orders"),
            metric: "MARKET",
            model: "orders",
            aggregation: { field: "type", value: "MARKET" },
            icon: "mdi:chart-line",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, span: 1, order: 2 },
          tablet: { cols: 1, span: 1 },
          desktop: { cols: 1, span: 1 },
        },
        items: [
          {
            // Limit orders add depth, market orders remove it. A collapsing
            // limit band is the book thinning out — the internal venue losing
            // its own liquidity providers.
            id: "liquidityProvisionOverTime",
            title: t("resting_vs_taking_flow"),
            type: "stackedBar",
            model: "orders",
            metrics: ["LIMIT", "MARKET"],
            timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
            labels: {
              LIMIT: tCommon("limit"),
              MARKET: tCommon("market"),
            },
            description: t("order_flow_split_into_resting_limit"),
          },
        ],
      },
    ],
  ] as AnalyticsConfig;
}
