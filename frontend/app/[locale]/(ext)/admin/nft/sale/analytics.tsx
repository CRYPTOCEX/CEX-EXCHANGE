import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const nftSaleAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Sale Status Overview – KPI Grid + Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 5, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 3, rows: 2, span: 2 },
      },
      items: [
        {
          id: "total_sales",
          title: "Total Sales",
          metric: "total",
          model: "nftSale",
          icon: "mdi:cart-outline",
        },
        {
          id: "pending_sales",
          title: "Pending Sales",
          metric: "PENDING",
          model: "nftSale",
          aggregation: { field: "status", value: "PENDING" },
          icon: "mdi:clock-outline",
        },
        {
          id: "completed_sales",
          title: "Completed Sales",
          metric: "COMPLETED",
          model: "nftSale",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "mdi:check-circle",
        },
        {
          id: "failed_sales",
          title: "Failed Sales",
          metric: "FAILED",
          model: "nftSale",
          aggregation: { field: "status", value: "FAILED" },
          icon: "mdi:close-circle",
        },
        {
          id: "cancelled_sales",
          title: "Cancelled Sales",
          metric: "CANCELLED",
          model: "nftSale",
          aggregation: { field: "status", value: "CANCELLED" },
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
          id: "saleStatusDistribution",
          title: "Sale Status Distribution",
          type: "pie",
          model: "nftSale",
          metrics: ["PENDING", "COMPLETED", "FAILED", "CANCELLED"],
          config: {
            field: "status",
            status: [
              {
                value: "PENDING",
                label: "Pending",
                color: "amber",
                icon: "mdi:clock-outline",
              },
              {
                value: "COMPLETED",
                label: "Completed",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "FAILED",
                label: "Failed",
                color: "red",
                icon: "mdi:close-circle",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "gray",
                icon: "mdi:cancel",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Financial Metrics – KPI Grid
  // ─────────────────────────────────────────────────────────────
  {
    type: "kpi",
    layout: { cols: 3, rows: 2 },
    responsive: {
      mobile: { cols: 1, rows: 6, span: 1 },
      tablet: { cols: 2, rows: 3, span: 1 },
      desktop: { cols: 3, rows: 2, span: 1 },
    },
    items: [
      {
        id: "total_sale_price",
        title: "Total Sale Price",
        metric: "sum",
        model: "nftSale",
        aggregation: { field: "price", operation: "sum" },
        icon: "mdi:currency-usd",
      },
      {
        id: "avg_sale_price",
        title: "Avg Sale Price",
        metric: "avg",
        model: "nftSale",
        aggregation: { field: "price", operation: "avg" },
        icon: "mdi:cash",
      },
      {
        id: "total_marketplace_fee",
        title: "Total Marketplace Fee",
        metric: "sum",
        model: "nftSale",
        aggregation: { field: "marketplaceFee", operation: "sum" },
        icon: "mdi:percent",
      },
      {
        id: "total_royalty_fee",
        title: "Total Royalty Fee",
        metric: "sum",
        model: "nftSale",
        aggregation: { field: "royaltyFee", operation: "sum" },
        icon: "mdi:account-cash",
      },
      {
        id: "total_fee",
        title: "Total Fees",
        metric: "sum",
        model: "nftSale",
        aggregation: { field: "totalFee", operation: "sum" },
        icon: "mdi:cash-multiple",
      },
      {
        id: "total_net_amount",
        title: "Total Net Amount",
        metric: "sum",
        model: "nftSale",
        aggregation: { field: "netAmount", operation: "sum" },
        icon: "mdi:cash-check",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 3: Fee Breakdown – Pie Chart
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
        id: "feeBreakdownDistribution",
        title: "Fee Breakdown Distribution",
        type: "pie",
        model: "nftSale",
        metrics: ["marketplaceFee", "royaltyFee"],
        config: {
          field: "fee_type",
          status: [
            {
              value: "marketplaceFee",
              label: "Marketplace Fee",
              color: "blue",
              icon: "mdi:store",
            },
            {
              value: "royaltyFee",
              label: "Royalty Fee",
              color: "purple",
              icon: "mdi:crown",
            },
          ],
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 4: Currency Distribution – KPI Grid + Pie Chart
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
          id: "eth_sales",
          title: "ETH Sales",
          metric: "ETH",
          model: "nftSale",
          aggregation: { field: "currency", value: "ETH" },
          icon: "mdi:ethereum",
        },
        {
          id: "btc_sales",
          title: "BTC Sales",
          metric: "BTC",
          model: "nftSale",
          aggregation: { field: "currency", value: "BTC" },
          icon: "mdi:bitcoin",
        },
        {
          id: "usdt_sales",
          title: "USDT Sales",
          metric: "USDT",
          model: "nftSale",
          aggregation: { field: "currency", value: "USDT" },
          icon: "mdi:currency-usd",
        },
        {
          id: "other_currency_sales",
          title: "Other Currency Sales",
          metric: "other",
          model: "nftSale",
          aggregation: { field: "currency", value: "other" },
          icon: "mdi:cash-multiple",
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
          id: "currencyDistribution",
          title: "Currency Distribution",
          type: "pie",
          model: "nftSale",
          metrics: ["ETH", "BTC", "USDT", "other"],
          config: {
            field: "currency",
            status: [
              {
                value: "ETH",
                label: "Ethereum",
                color: "blue",
                icon: "mdi:ethereum",
              },
              {
                value: "BTC",
                label: "Bitcoin",
                color: "orange",
                icon: "mdi:bitcoin",
              },
              {
                value: "USDT",
                label: "Tether",
                color: "green",
                icon: "mdi:currency-usd",
              },
              {
                value: "other",
                label: "Other",
                color: "gray",
                icon: "mdi:cash-multiple",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 5: Sales Over Time – Full-Width Line Chart
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
        id: "salesOverTime",
        title: "Sales Over Time",
        type: "line",
        model: "nftSale",
        metrics: ["total", "COMPLETED", "PENDING", "FAILED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Sales",
          COMPLETED: "Completed Sales",
          PENDING: "Pending Sales",
          FAILED: "Failed Sales",
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 6: Revenue Over Time – Full-Width Line Chart
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
        id: "revenueOverTime",
        title: "Revenue Over Time",
        type: "line",
        model: "nftSale",
        metrics: ["price", "netAmount", "totalFee"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          price: "Total Price",
          netAmount: "Net Amount",
          totalFee: "Total Fees",
        },
      },
    ],
  },
] satisfies AnalyticsConfig; 