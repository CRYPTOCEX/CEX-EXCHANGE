"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  // NOTE: this page runs against Scylla (`db="scylla"`, keyspace "futures"),
  // whose aggregator understands only "count rows where column = literal".
  // Sums, averages, distinct counts and derived ratios are not available on
  // this path, so `cost`, `fee` and `leverage` cannot be aggregated here —
  // every figure below is a row count. What IS available and was never used:
  // `reduceOnly` and `isTaker`, the two columns that make a futures order book
  // different from the spot book this config used to be a copy of.
  return [
    // ─────────────────────────────────────────────────────────────
    // Section 1 — Book state.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 3, rows: 1 },
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 3, span: 2 },
          desktop: { cols: 3, span: 2 },
        },
        items: [
          {
            id: "total_orders",
            title: t("total_futures_orders"),
            metric: "total",
            model: "orders",
            icon: "mdi:finance",
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
            id: "filled_orders",
            title: t("filled_orders"),
            metric: "CLOSED",
            model: "orders",
            aggregation: { field: "status", value: "CLOSED" },
            icon: "mdi:check-circle",
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
            id: "futuresOrderStatusDistribution",
            title: t("futures_status_distribution"),
            type: "pie",
            model: "orders",
            metrics: ["OPEN", "CLOSED", "CANCELLED"],
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
                  value: "CANCELLED",
                  label: tCommon("cancelled"),
                  color: "amber",
                  icon: "mdi:cancel",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Section 2 — Risk direction of the flow. `reduceOnly` separates
    // traders opening exposure from traders closing it: a sharp rise in
    // reduce-only flow is the crowd de-risking, usually just before the
    // volatility the risk desk needs to be awake for.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 2, rows: 2 },
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 2, span: 2 },
        },
        items: [
          {
            id: "risk_increasing_orders",
            title: t("risk_increasing_orders"),
            metric: "riskOn",
            model: "orders",
            aggregation: { field: "reduceOnly", value: "false" },
            icon: "mdi:arrow-expand-up",
          },
          {
            id: "reduce_only_orders",
            title: t("reduce_only_orders"),
            metric: "reduceOnly",
            model: "orders",
            aggregation: { field: "reduceOnly", value: "true" },
            icon: "mdi:arrow-collapse-down",
          },
          {
            id: "taker_orders",
            title: t("taker_orders"),
            metric: "taker",
            model: "orders",
            aggregation: { field: "isTaker", value: "true" },
            icon: "mdi:lightning-bolt",
          },
          {
            id: "maker_orders",
            title: t("maker_orders"),
            metric: "maker",
            model: "orders",
            aggregation: { field: "isTaker", value: "false" },
            icon: "mdi:waves",
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
            id: "riskDirectionOverTime",
            title: t("risk_increasing_vs_reduce_only_flow"),
            type: "stackedBar",
            model: "orders",
            metrics: ["riskOn", "reduceOnly"],
            timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
            labels: {
              riskOn: "Opening risk",
              reduceOnly: "Closing risk",
            },
            description:
              t("a_reduce_only_band_that_suddenly"),
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Section 3 — Taker flow pays the fees and consumes the book; maker
    // flow provides it. The mix decides both revenue and whether the
    // venue can hold a book without house quoting.
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
          id: "takerVsMakerOverTime",
          title: t("taker_vs_maker_flow"),
          type: "stackedBar",
          model: "orders",
          metrics: ["taker", "maker"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            taker: "Taker",
            maker: "Maker",
          },
          description:
            t("rows_written_before_istaker_existed_are"),
        },
      ],
    },
  ] as AnalyticsConfig;
}
