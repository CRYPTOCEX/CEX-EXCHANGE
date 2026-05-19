"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";
import { useTranslations } from "next-intl";

export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return [
    // ─────────────────────────────────────────────────────────────
    // Group 1: Binary Order Status Overview – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 5, rows: 1 },
        responsive: {
          mobile: { cols: 1, rows: 5, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 5, rows: 1, span: 2 },
        },
        items: [
          {
            id: "total_binary_orders",
            title: tCommon("total_orders"),
            metric: "total",
            model: "binaryOrder",
            icon: "mdi:chart-timeline-variant",
          },
          {
            id: "pending_orders",
            title: tCommon("pending"),
            metric: "PENDING",
            model: "binaryOrder",
            aggregation: { field: "status", value: "PENDING" },
            icon: "mdi:clock-outline",
          },
          {
            id: "winning_orders",
            title: tCommon("win"),
            metric: "WIN",
            model: "binaryOrder",
            aggregation: { field: "status", value: "WIN" },
            icon: "mdi:trophy",
          },
          {
            id: "losing_orders",
            title: tCommon("loss"),
            metric: "LOSS",
            model: "binaryOrder",
            aggregation: { field: "status", value: "LOSS" },
            icon: "mdi:trending-down",
          },
          {
            id: "draw_orders",
            title: tCommon("draw"),
            metric: "DRAW",
            model: "binaryOrder",
            aggregation: { field: "status", value: "DRAW" },
            icon: "mdi:equal",
          },
        ],
      },
      {
        type: "kpi",
        layout: { cols: 1, rows: 1 },
        responsive: {
          mobile: { cols: 1, rows: 1, span: 1 },
          tablet: { cols: 1, rows: 1, span: 1 },
          desktop: { cols: 1, rows: 1, span: 1 },
        },
        items: [
          {
            id: "canceled_orders",
            title: tCommon("cancelled"),
            metric: "CANCELED",
            model: "binaryOrder",
            aggregation: { field: "status", value: "CANCELED" },
            icon: "mdi:cancel",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, rows: 1, span: 1 },
          tablet: { cols: 1, rows: 1, span: 1 },
          desktop: { cols: 1, rows: 1, span: 1 },
        },
        items: [
          {
            id: "binaryOrderStatusDistribution",
            title: tCommon("status_distribution"),
            type: "pie",
            model: "binaryOrder",
            metrics: ["PENDING", "WIN", "LOSS", "DRAW", "CANCELED"],
            config: {
              field: "status",
              status: [
                {
                  value: "PENDING",
                  label: tCommon("pending"),
                  color: "orange",
                  icon: "mdi:clock-outline",
                },
                {
                  value: "WIN",
                  label: tCommon("win"),
                  color: "green",
                  icon: "mdi:trophy",
                },
                {
                  value: "LOSS",
                  label: tCommon("loss"),
                  color: "red",
                  icon: "mdi:trending-down",
                },
                {
                  value: "DRAW",
                  label: tCommon("draw"),
                  color: "gray",
                  icon: "mdi:equal",
                },
                {
                  value: "CANCELED",
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
    // Group 2: Binary Order Types – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 5, rows: 1 },
        responsive: {
          mobile: { cols: 1, rows: 5, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 5, rows: 1, span: 2 },
        },
        items: [
          {
            id: "rise_fall_orders",
            title: "Rise/Fall",
            metric: "RISE_FALL",
            model: "binaryOrder",
            aggregation: { field: "type", value: "RISE_FALL" },
            icon: "mdi:swap-vertical",
          },
          {
            id: "higher_lower_orders",
            title: "Higher/Lower",
            metric: "HIGHER_LOWER",
            model: "binaryOrder",
            aggregation: { field: "type", value: "HIGHER_LOWER" },
            icon: "mdi:arrow-up-down",
          },
          {
            id: "touch_no_touch_orders",
            title: "Touch/No Touch",
            metric: "TOUCH_NO_TOUCH",
            model: "binaryOrder",
            aggregation: { field: "type", value: "TOUCH_NO_TOUCH" },
            icon: "mdi:gesture-tap",
          },
          {
            id: "call_put_orders",
            title: "Call/Put",
            metric: "CALL_PUT",
            model: "binaryOrder",
            aggregation: { field: "type", value: "CALL_PUT" },
            icon: "mdi:phone",
          },
          {
            id: "turbo_orders",
            title: "Turbo",
            metric: "TURBO",
            model: "binaryOrder",
            aggregation: { field: "type", value: "TURBO" },
            icon: "mdi:rocket-launch",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, rows: 1, span: 1 },
          tablet: { cols: 1, rows: 1, span: 1 },
          desktop: { cols: 1, rows: 1, span: 1 },
        },
        items: [
          {
            id: "binaryOrderTypeDistribution",
            title: "Binary Order Types",
            type: "pie",
            model: "binaryOrder",
            metrics: [
              "RISE_FALL",
              "HIGHER_LOWER",
              "TOUCH_NO_TOUCH",
              "CALL_PUT",
              "TURBO",
            ],
            config: {
              field: "type",
              status: [
                {
                  value: "RISE_FALL",
                  label: "Rise/Fall",
                  color: "blue",
                  icon: "mdi:swap-vertical",
                },
                {
                  value: "HIGHER_LOWER",
                  label: "Higher/Lower",
                  color: "purple",
                  icon: "mdi:arrow-up-down",
                },
                {
                  value: "TOUCH_NO_TOUCH",
                  label: "Touch/No Touch",
                  color: "cyan",
                  icon: "mdi:gesture-tap",
                },
                {
                  value: "CALL_PUT",
                  label: "Call/Put",
                  color: "indigo",
                  icon: "mdi:phone",
                },
                {
                  value: "TURBO",
                  label: "Turbo",
                  color: "orange",
                  icon: "mdi:rocket-launch",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 3: Binary Order Side Distribution – KPI Grid & Pie Chart
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 5, rows: 2 },
        responsive: {
          mobile: { cols: 1, rows: 10, span: 1 },
          tablet: { cols: 2, rows: 5, span: 2 },
          desktop: { cols: 5, rows: 2, span: 2 },
        },
        items: [
          {
            id: "rise_side_orders",
            title: "RISE",
            metric: "RISE",
            model: "binaryOrder",
            aggregation: { field: "side", value: "RISE" },
            icon: "mdi:arrow-up-bold",
          },
          {
            id: "fall_side_orders",
            title: "FALL",
            metric: "FALL",
            model: "binaryOrder",
            aggregation: { field: "side", value: "FALL" },
            icon: "mdi:arrow-down-bold",
          },
          {
            id: "higher_side_orders",
            title: "HIGHER",
            metric: "HIGHER",
            model: "binaryOrder",
            aggregation: { field: "side", value: "HIGHER" },
            icon: "mdi:chevron-double-up",
          },
          {
            id: "lower_side_orders",
            title: "LOWER",
            metric: "LOWER",
            model: "binaryOrder",
            aggregation: { field: "side", value: "LOWER" },
            icon: "mdi:chevron-double-down",
          },
          {
            id: "touch_side_orders",
            title: "TOUCH",
            metric: "TOUCH",
            model: "binaryOrder",
            aggregation: { field: "side", value: "TOUCH" },
            icon: "mdi:hand-pointing-up",
          },
          {
            id: "no_touch_side_orders",
            title: "NO TOUCH",
            metric: "NO_TOUCH",
            model: "binaryOrder",
            aggregation: { field: "side", value: "NO_TOUCH" },
            icon: "mdi:hand-pointing-down",
          },
          {
            id: "call_side_orders",
            title: "CALL",
            metric: "CALL",
            model: "binaryOrder",
            aggregation: { field: "side", value: "CALL" },
            icon: "mdi:phone-incoming",
          },
          {
            id: "put_side_orders",
            title: "PUT",
            metric: "PUT",
            model: "binaryOrder",
            aggregation: { field: "side", value: "PUT" },
            icon: "mdi:phone-outgoing",
          },
          {
            id: "up_side_orders",
            title: "UP",
            metric: "UP",
            model: "binaryOrder",
            aggregation: { field: "side", value: "UP" },
            icon: "mdi:arrow-up-thick",
          },
          {
            id: "down_side_orders",
            title: "DOWN",
            metric: "DOWN",
            model: "binaryOrder",
            aggregation: { field: "side", value: "DOWN" },
            icon: "mdi:arrow-down-thick",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, rows: 1, span: 1 },
          tablet: { cols: 1, rows: 1, span: 1 },
          desktop: { cols: 1, rows: 1, span: 1 },
        },
        items: [
          {
            id: "binaryOrderSideDistribution",
            title: "Binary Order Side Distribution",
            type: "pie",
            model: "binaryOrder",
            metrics: [
              "RISE",
              "FALL",
              "HIGHER",
              "LOWER",
              "TOUCH",
              "NO_TOUCH",
              "CALL",
              "PUT",
              "UP",
              "DOWN",
            ],
            config: {
              field: "side",
              status: [
                {
                  value: "RISE",
                  label: "Rise",
                  color: "green",
                  icon: "mdi:arrow-up-bold",
                },
                {
                  value: "FALL",
                  label: "Fall",
                  color: "red",
                  icon: "mdi:arrow-down-bold",
                },
                {
                  value: "HIGHER",
                  label: "Higher",
                  color: "emerald",
                  icon: "mdi:chevron-double-up",
                },
                {
                  value: "LOWER",
                  label: "Lower",
                  color: "rose",
                  icon: "mdi:chevron-double-down",
                },
                {
                  value: "TOUCH",
                  label: "Touch",
                  color: "blue",
                  icon: "mdi:hand-pointing-up",
                },
                {
                  value: "NO_TOUCH",
                  label: "No Touch",
                  color: "gray",
                  icon: "mdi:hand-pointing-down",
                },
                {
                  value: "CALL",
                  label: "Call",
                  color: "purple",
                  icon: "mdi:phone-incoming",
                },
                {
                  value: "PUT",
                  label: "Put",
                  color: "orange",
                  icon: "mdi:phone-outgoing",
                },
                {
                  value: "UP",
                  label: "Up",
                  color: "cyan",
                  icon: "mdi:arrow-up-thick",
                },
                {
                  value: "DOWN",
                  label: "Down",
                  color: "amber",
                  icon: "mdi:arrow-down-thick",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 4: Duration Type & Demo/Live – KPI Grid & Pie Charts
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi",
        layout: { cols: 2, rows: 2 },
        responsive: {
          mobile: { cols: 1, rows: 4, span: 1 },
          tablet: { cols: 2, rows: 2, span: 2 },
          desktop: { cols: 2, rows: 2, span: 2 },
        },
        items: [
          {
            id: "time_duration_orders",
            title: "Time-Based",
            metric: "TIME",
            model: "binaryOrder",
            aggregation: { field: "durationType", value: "TIME" },
            icon: "mdi:clock-time-four",
          },
          {
            id: "ticks_duration_orders",
            title: "Ticks-Based",
            metric: "TICKS",
            model: "binaryOrder",
            aggregation: { field: "durationType", value: "TICKS" },
            icon: "mdi:counter",
          },
          {
            id: "demo_orders",
            title: t("demo_orders"),
            metric: "demo",
            model: "binaryOrder",
            aggregation: { field: "isDemo", value: "true" },
            icon: "mdi:account-question",
          },
          {
            id: "live_orders",
            title: t("live_orders"),
            metric: "live",
            model: "binaryOrder",
            aggregation: { field: "isDemo", value: "false" },
            icon: "mdi:account-check",
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, rows: 1, span: 1 },
          tablet: { cols: 1, rows: 1, span: 1 },
          desktop: { cols: 1, rows: 1, span: 1 },
        },
        items: [
          {
            id: "durationTypeDistribution",
            title: "Duration Type Distribution",
            type: "pie",
            model: "binaryOrder",
            metrics: ["TIME", "TICKS"],
            config: {
              field: "durationType",
              status: [
                {
                  value: "TIME",
                  label: "Time-Based",
                  color: "blue",
                  icon: "mdi:clock-time-four",
                },
                {
                  value: "TICKS",
                  label: "Ticks-Based",
                  color: "purple",
                  icon: "mdi:counter",
                },
              ],
            },
          },
        ],
      },
      {
        type: "chart",
        responsive: {
          mobile: { cols: 1, rows: 1, span: 1 },
          tablet: { cols: 1, rows: 1, span: 1 },
          desktop: { cols: 1, rows: 1, span: 1 },
        },
        items: [
          {
            id: "demoVsLiveDistribution",
            title: "Demo vs Live Distribution",
            type: "pie",
            model: "binaryOrder",
            metrics: ["demo", "live"],
            config: {
              field: "isDemo",
              status: [
                {
                  value: "true",
                  label: "Demo",
                  color: "orange",
                  icon: "mdi:account-question",
                },
                {
                  value: "false",
                  label: "Live",
                  color: "green",
                  icon: "mdi:account-check",
                },
              ],
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Group 5: Financial Metrics – KPI Grid
    // ─────────────────────────────────────────────────────────────
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      responsive: {
        mobile: { cols: 1, rows: 3, span: 1 },
          tablet: { cols: 3, rows: 1, span: 2 },
          desktop: { cols: 3, rows: 1, span: 2 },
      },
      items: [
        {
          id: "total_invested_amount",
          title: "Total Invested",
          metric: "amount",
          model: "binaryOrder",
          icon: "mdi:cash-multiple",
        },
        {
          id: "total_profit",
          title: "Total Profit",
          metric: "profit",
          model: "binaryOrder",
          icon: "mdi:trending-up",
        },
        {
          id: "average_order_amount",
          title: "Average Order Amount",
          metric: "average",
          model: "binaryOrder",
          icon: "mdi:calculator",
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Group 6: Trends Over Time – Line Chart
    // ─────────────────────────────────────────────────────────────
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "binaryOrdersOverTime",
          title: tCommon("orders_over_time"),
          type: "line",
          model: "binaryOrder",
          metrics: ["total", "WIN", "LOSS", "PENDING"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Orders",
            WIN: "Winning",
            LOSS: "Losing",
            PENDING: "Pending",
          },
        },
      ],
    },
  ] as AnalyticsConfig;
}
