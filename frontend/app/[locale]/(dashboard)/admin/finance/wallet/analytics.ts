import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const walletAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Wallet Overview – Counts & Financial KPIs
  // ─────────────────────────────────────────────────────────────
  [
    // Left Column: Count KPIs
    {
      type: "kpi",
      layout: { cols: 3, rows: 1 },
      items: [
        {
          id: "total_wallets",
          title: "Total Wallets",
          metric: "total", // COUNT(*)
          model: "wallet",
          icon: "mdi:wallet",
        },
        {
          id: "active_wallets",
          title: "Status",
          metric: "active",
          model: "wallet",
          aggregation: { field: "status", value: "true" },
          icon: "mdi:checkbox-marked-circle",
        },
        {
          id: "inactive_wallets",
          title: "Inactive",
          metric: "inactive",
          model: "wallet",
          aggregation: { field: "status", value: "false" },
          icon: "mdi:checkbox-blank-circle-outline",
        },
      ],
    },
    // Right Column: Financial KPIs
    {
      type: "kpi",
      layout: { cols: 2, rows: 1 },
      items: [
        {
          id: "total_balance",
          title: "Total Balance",
          metric: "balance", // SUM(balance); aggregator must sum values
          model: "wallet",
          icon: "mdi:cash",
        },
        {
          id: "inOrder_amount",
          title: "In Order",
          metric: "inOrder", // SUM(inOrder)
          model: "wallet",
          icon: "mdi:cart-outline",
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Wallet Type Distribution – KPI Grid and Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    // Left Column: Wallet Type KPI Grid (4 cards)
    {
      type: "kpi",
      layout: { cols: 4, rows: 1 },
      items: [
        {
          id: "fiat_wallets",
          title: "FIAT",
          metric: "FIAT",
          model: "wallet",
          aggregation: { field: "type", value: "FIAT" },
          icon: "mdi:currency-usd",
        },
        {
          id: "spot_wallets",
          title: "SPOT",
          metric: "SPOT",
          model: "wallet",
          aggregation: { field: "type", value: "SPOT" },
          icon: "mdi:chart-line",
        },
        {
          id: "eco_wallets",
          title: "ECO",
          metric: "ECO",
          model: "wallet",
          aggregation: { field: "type", value: "ECO" },
          icon: "mdi:leaf",
        },
        {
          id: "futures_wallets",
          title: "FUTURES",
          metric: "FUTURES",
          model: "wallet",
          aggregation: { field: "type", value: "FUTURES" },
          icon: "mdi:clock-fast",
        },
      ],
    },
    // Right Column: Pie Chart for Wallet Type Distribution
    {
      type: "chart",
      items: [
        {
          id: "walletTypeDistribution",
          title: "Wallet Type Distribution",
          type: "pie",
          model: "wallet",
          metrics: ["FIAT", "SPOT", "ECO", "FUTURES"],
          config: {
            field: "type",
            status: [
              {
                value: "FIAT",
                label: "FIAT",
                color: "gold",
                icon: "mdi:currency-usd",
              },
              {
                value: "SPOT",
                label: "SPOT",
                color: "blue",
                icon: "mdi:chart-line",
              },
              { value: "ECO", label: "ECO", color: "green", icon: "mdi:leaf" },
              {
                value: "FUTURES",
                label: "FUTURES",
                color: "purple",
                icon: "mdi:clock-fast",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Wallet Trends Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "walletsOverTime",
        title: "Wallets Over Time",
        type: "line",
        model: "wallet",
        metrics: ["total"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Wallets",
        },
      },
    ],
  },
];
