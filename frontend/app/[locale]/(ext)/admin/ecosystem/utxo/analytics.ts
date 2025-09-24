import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const ecosystemUtxoAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: UTXO Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 }, // 2 columns x 2 rows = 4 KPI cards
      items: [
        {
          id: "total_utxos",
          title: "Total UTXOs",
          metric: "total", // Counts all UTXOs
          model: "ecosystemUtxo",
          icon: "mdi:counter",
        },
        {
          id: "active_utxos",
          title: "Active UTXOs",
          metric: "active",
          model: "ecosystemUtxo",
          aggregation: { field: "status", value: "true" },
          icon: "mdi:checkbox-marked-circle",
        },
        {
          id: "inactive_utxos",
          title: "Inactive UTXOs",
          metric: "inactive",
          model: "ecosystemUtxo",
          aggregation: { field: "status", value: "false" },
          icon: "mdi:checkbox-blank-circle-outline",
        },
        {
          id: "total_amount",
          title: "Total Amount",
          metric: "amount",
          model: "ecosystemUtxo",
          // Note: Your aggregator must be modified to sum the `amount` field.
          icon: "mdi:cash",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "utxoStatusDistribution",
          title: "UTXO Status Distribution",
          type: "pie",
          model: "ecosystemUtxo",
          metrics: ["active", "inactive"],
          config: {
            field: "status",
            status: [
              {
                value: "true",
                label: "Active",
                color: "green",
                icon: "mdi:checkbox-marked-circle",
              },
              {
                value: "false",
                label: "Inactive",
                color: "red",
                icon: "mdi:checkbox-blank-circle-outline",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: UTXOs Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "utxosOverTime",
        title: "UTXOs Over Time",
        type: "line",
        model: "ecosystemUtxo",
        // Metrics for the time series: total count, active, and inactive UTXOs
        metrics: ["total", "active", "inactive"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total",
          active: "Active",
          inactive: "Inactive",
        },
      },
    ],
  },
];
