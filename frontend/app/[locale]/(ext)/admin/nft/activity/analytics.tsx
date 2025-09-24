import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const nftActivityAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Activity Overview – KPI Grid on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      items: [
        {
          id: "total_activities",
          title: "Total Activities",
          metric: "total",
          model: "nftActivity",
          icon: "mdi:chart-line",
        },
        {
          id: "mint_activities",
          title: "Mints",
          metric: "MINT",
          model: "nftActivity",
          aggregation: { field: "type", value: "MINT" },
          icon: "mdi:hammer",
        },
        {
          id: "transfer_activities",
          title: "Transfers",
          metric: "TRANSFER",
          model: "nftActivity",
          aggregation: { field: "type", value: "TRANSFER" },
          icon: "mdi:swap-horizontal",
        },
        {
          id: "sale_activities",
          title: "Sales",
          metric: "SALE",
          model: "nftActivity",
          aggregation: { field: "type", value: "SALE" },
          icon: "mdi:currency-usd",
        },
        {
          id: "list_activities",
          title: "Listings",
          metric: "LIST",
          model: "nftActivity",
          aggregation: { field: "type", value: "LIST" },
          icon: "mdi:format-list-bulleted",
        },
        {
          id: "bid_activities",
          title: "Bids",
          metric: "BID",
          model: "nftActivity",
          aggregation: { field: "type", value: "BID" },
          icon: "mdi:gavel",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "activityTypeDistribution",
          title: "Activity Type Distribution",
          type: "pie",
          model: "nftActivity",
          metrics: ["MINT", "TRANSFER", "SALE", "LIST", "BID", "OFFER"],
          config: {
            field: "type",
            status: [
              {
                value: "MINT",
                label: "Mint",
                color: "green",
                icon: "mdi:hammer",
              },
              {
                value: "TRANSFER",
                label: "Transfer",
                color: "blue",
                icon: "mdi:swap-horizontal",
              },
              {
                value: "SALE",
                label: "Sale",
                color: "purple",
                icon: "mdi:currency-usd",
              },
              {
                value: "LIST",
                label: "List",
                color: "orange",
                icon: "mdi:format-list-bulleted",
              },
              {
                value: "BID",
                label: "Bid",
                color: "yellow",
                icon: "mdi:gavel",
              },
              {
                value: "OFFER",
                label: "Offer",
                color: "cyan",
                icon: "mdi:handshake",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Activities Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "chart",
      items: [
        {
          id: "activitiesOverTime",
          title: "Activities Over Time",
          type: "line",
          model: "nftActivity",
          metrics: ["total", "MINT", "TRANSFER", "SALE"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Activities",
            MINT: "Mints",
            TRANSFER: "Transfers",
            SALE: "Sales",
          },
        },
      ],
    },
  ],
]; 