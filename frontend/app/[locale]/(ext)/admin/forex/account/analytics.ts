import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const forexAccountAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Account Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 }, // 2 columns x 2 rows = 4 KPI cards
      items: [
        {
          id: "total_forex_accounts",
          title: "Total Accounts",
          metric: "total", // COUNT(*)
          model: "forexAccount",
          icon: "mdi:account-multiple",
        },
        {
          id: "live_forex_accounts",
          title: "Live Accounts",
          metric: "LIVE",
          model: "forexAccount",
          aggregation: { field: "type", value: "LIVE" },
          icon: "mdi:account-check",
        },
        {
          id: "demo_forex_accounts",
          title: "Demo Accounts",
          metric: "DEMO",
          model: "forexAccount",
          aggregation: { field: "type", value: "DEMO" },
          icon: "mdi:account-tie",
        },
        {
          id: "active_forex_accounts",
          title: "Active Accounts",
          metric: "active",
          model: "forexAccount",
          aggregation: { field: "status", value: "true" },
          icon: "mdi:checkbox-marked-circle",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "forexAccountTypeDistribution",
          title: "Account Type Distribution",
          type: "pie",
          model: "forexAccount",
          metrics: ["LIVE", "DEMO"],
          config: {
            field: "type",
            status: [
              {
                value: "LIVE",
                label: "Live",
                color: "green",
                icon: "mdi:account-check",
              },
              {
                value: "DEMO",
                label: "Demo",
                color: "blue",
                icon: "mdi:account-tie",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Accounts Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "forexAccountsOverTime",
        title: "Accounts Over Time",
        type: "line",
        model: "forexAccount",
        metrics: ["total", "LIVE", "DEMO"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total",
          LIVE: "Live",
          DEMO: "Demo",
        },
      },
    ],
  },
];
