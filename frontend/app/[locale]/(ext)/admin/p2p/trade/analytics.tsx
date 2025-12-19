import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const tradeAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Trade Overview - KPI Grid on Left, Status Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 6, span: 1 },
          tablet: { cols: 2, rows: 3, span: 2 },
          desktop: { cols: 3, rows: 2, span: 2 },
      },
      items: [
        {
          id: "total_trades",
          title: "Total Trades",
          metric: "total",
          model: "p2pTrade",
          icon: "mdi:swap-horizontal",
        },
        {
          id: "completed_trades",
          title: "Completed Trades",
          metric: "COMPLETED",
          model: "p2pTrade",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "mdi:check-circle",
        },
        {
          id: "pending_trades",
          title: "Pending Trades",
          metric: "PENDING",
          model: "p2pTrade",
          aggregation: { field: "status", value: "PENDING" },
          icon: "mdi:clock-outline",
        },
        {
          id: "payment_sent_trades",
          title: "Payment Sent",
          metric: "PAYMENT_SENT",
          model: "p2pTrade",
          aggregation: { field: "status", value: "PAYMENT_SENT" },
          icon: "mdi:cash-check",
        },
        {
          id: "cancelled_trades",
          title: "Cancelled Trades",
          metric: "CANCELLED",
          model: "p2pTrade",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "mdi:close-circle",
        },
        {
          id: "disputed_trades",
          title: "Disputed Trades",
          metric: "DISPUTED",
          model: "p2pTrade",
          aggregation: { field: "status", value: "DISPUTED" },
          icon: "mdi:alert-circle",
        },
        {
          id: "expired_trades",
          title: "Expired Trades",
          metric: "EXPIRED",
          model: "p2pTrade",
          aggregation: { field: "status", value: "EXPIRED" },
          icon: "mdi:timer-off",
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
          id: "tradeStatusDistribution",
          title: "Trade Status Distribution",
          type: "pie",
          model: "p2pTrade",
          metrics: [
            "COMPLETED",
            "PENDING",
            "PAYMENT_SENT",
            "CANCELLED",
            "DISPUTED",
            "EXPIRED",
          ],
          config: {
            field: "status",
            status: [
              {
                value: "COMPLETED",
                label: "Completed",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "PENDING",
                label: "Pending",
                color: "amber",
                icon: "mdi:clock-outline",
              },
              {
                value: "PAYMENT_SENT",
                label: "Payment Sent",
                color: "blue",
                icon: "mdi:cash-check",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "orange",
                icon: "mdi:close-circle",
              },
              {
                value: "DISPUTED",
                label: "Disputed",
                color: "red",
                icon: "mdi:alert-circle",
              },
              {
                value: "EXPIRED",
                label: "Expired",
                color: "violet",
                icon: "mdi:timer-off",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Financial Metrics - KPI Cards
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
          id: "total_trade_amount",
          title: "Total Trade Amount",
          metric: "amount",
          model: "p2pTrade",
          icon: "mdi:currency-usd",
          aggregation: { type: "sum", field: "amount" },
        },
        {
          id: "total_trade_value",
          title: "Total Trade Value",
          metric: "total",
          model: "p2pTrade",
          icon: "mdi:cash-multiple",
          aggregation: { type: "sum", field: "total" },
        },
        {
          id: "avg_trade_price",
          title: "Average Trade Price",
          metric: "price",
          model: "p2pTrade",
          icon: "mdi:chart-line",
          aggregation: { type: "avg", field: "price" },
        },
        {
          id: "total_buyer_fees",
          title: "Total Buyer Fees",
          metric: "buyerFee",
          model: "p2pTrade",
          icon: "mdi:cash-minus",
          aggregation: { type: "sum", field: "buyerFee" },
        },
        {
          id: "total_seller_fees",
          title: "Total Seller Fees",
          metric: "sellerFee",
          model: "p2pTrade",
          icon: "mdi:cash-remove",
          aggregation: { type: "sum", field: "sellerFee" },
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
          id: "tradeTypeDistribution",
          title: "Buy vs Sell Trades",
          type: "pie",
          model: "p2pTrade",
          metrics: ["BUY", "SELL"],
          config: {
            field: "type",
            status: [
              {
                value: "BUY",
                label: "Buy Trades",
                color: "green",
                icon: "mdi:arrow-down-circle",
              },
              {
                value: "SELL",
                label: "Sell Trades",
                color: "red",
                icon: "mdi:arrow-up-circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Trade Volume Over Time - Full-Width Line Chart
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
        id: "tradesOverTime",
        title: "Trades Over Time",
        type: "line",
        model: "p2pTrade",
        metrics: ["total", "COMPLETED", "PENDING", "DISPUTED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Trades",
          COMPLETED: "Completed Trades",
          PENDING: "Pending Trades",
          DISPUTED: "Disputed Trades",
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 4: Financial Analytics Over Time
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "chart",
      responsive: {
        mobile: { cols: 1, rows: 1, span: 1 },
        tablet: { cols: 1, rows: 1, span: 1 },
        desktop: { cols: 1, rows: 1, span: 1 },
      },
      items: [
        {
          id: "tradeValueOverTime",
          title: "Trade Value Over Time",
          type: "line",
          model: "p2pTrade",
          metrics: ["total", "amount"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Value",
            amount: "Total Amount",
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
          id: "feeAnalyticsOverTime",
          title: "Fee Analytics Over Time",
          type: "line",
          model: "p2pTrade",
          metrics: ["buyerFee", "sellerFee"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            buyerFee: "Buyer Fees",
            sellerFee: "Seller Fees",
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 5: Completion Rate & Dispute Rate Analytics
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
        id: "completionRateOverTime",
        title: "Completion & Dispute Rates Over Time",
        type: "line",
        model: "p2pTrade",
        metrics: ["COMPLETED", "CANCELLED", "DISPUTED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          COMPLETED: "Completion Rate",
          CANCELLED: "Cancellation Rate",
          DISPUTED: "Dispute Rate",
        },
      },
    ],
  },
];
