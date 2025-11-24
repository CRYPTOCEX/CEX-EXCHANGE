import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const exchangeOrderAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Row #1: Status KPIs (2x2) on the left + Status Pie Chart on the right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 2 }, // 2 columns x 2 rows => 4 KPI cards
      items: [
        {
          id: "total_exchange_orders",
          title: "Total Orders",
          metric: "total",
          model: "exchangeOrder",
          icon: "mdi:finance",
        },
        {
          id: "open_orders",
          title: "Open Orders",
          metric: "OPEN",
          model: "exchangeOrder",
          aggregation: { field: "status", value: "OPEN" },
          icon: "mdi:door-open",
        },
        {
          id: "closed_orders",
          title: "Closed Orders",
          metric: "CLOSED",
          model: "exchangeOrder",
          aggregation: { field: "status", value: "CLOSED" },
          icon: "mdi:door-closed",
        },
        {
          id: "canceled_orders",
          title: "Canceled Orders",
          metric: "CANCELED",
          model: "exchangeOrder",
          aggregation: { field: "status", value: "CANCELED" },
          icon: "mdi:cancel",
        },
        {
          id: "expired_orders",
          title: "Expired Orders",
          metric: "EXPIRED",
          model: "exchangeOrder",
          aggregation: { field: "status", value: "EXPIRED" },
          icon: "mdi:timer-off",
        },
        {
          id: "rejected_orders",
          title: "Rejected Orders",
          metric: "REJECTED",
          model: "exchangeOrder",
          aggregation: { field: "status", value: "REJECTED" },
          icon: "mdi:thumb-down",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "exchangeOrderStatusDistribution",
          title: "Status Distribution",
          type: "pie",
          model: "exchangeOrder",
          metrics: ["OPEN", "CLOSED", "CANCELED", "EXPIRED", "REJECTED"],
          config: {
            field: "status",
            status: [
              {
                value: "OPEN",
                label: "Open",
                color: "blue",
                icon: "mdi:door-open",
              },
              {
                value: "CLOSED",
                label: "Closed",
                color: "green",
                icon: "mdi:door-closed",
              },
              {
                value: "CANCELED",
                label: "Canceled",
                color: "amber",
                icon: "mdi:cancel",
              },
              {
                value: "EXPIRED",
                label: "Expired",
                color: "red",
                icon: "mdi:timer-off",
              },
              {
                value: "REJECTED",
                label: "Rejected",
                color: "purple",
                icon: "mdi:thumb-down",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Row #2: More KPIs (2x2) on the left + Side Pie Chart on the right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "buy_orders",
          title: "Buy Orders",
          metric: "buy",
          model: "exchangeOrder",
          aggregation: { field: "side", value: "BUY" },
          icon: "mdi:cart-arrow-down",
        },
        {
          id: "sell_orders",
          title: "Sell Orders",
          metric: "sell",
          model: "exchangeOrder",
          aggregation: { field: "side", value: "SELL" },
          icon: "mdi:cart-arrow-up",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "exchangeOrderSideDistribution",
          title: "Side Distribution",
          type: "pie",
          model: "exchangeOrder",
          metrics: ["BUY", "SELL"],
          config: {
            field: "side",
            status: [
              {
                value: "BUY",
                label: "Buy",
                color: "green",
                icon: "mdi:cart-arrow-down",
              },
              {
                value: "SELL",
                label: "Sell",
                color: "red",
                icon: "mdi:cart-arrow-up",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Row #3: Type & Time-In-Force KPIs (2x2) on the left + Type Pie Chart on the right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "market_orders",
          title: "Market Orders",
          metric: "MARKET",
          model: "exchangeOrder",
          aggregation: { field: "type", value: "MARKET" },
          icon: "mdi:chart-line",
        },
        {
          id: "limit_orders",
          title: "Limit Orders",
          metric: "LIMIT",
          model: "exchangeOrder",
          aggregation: { field: "type", value: "LIMIT" },
          icon: "mdi:chart-bell-curve",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "exchangeOrderTypeDistribution",
          title: "Type Distribution",
          type: "pie",
          model: "exchangeOrder",
          metrics: ["MARKET", "LIMIT"],
          config: {
            field: "type",
            status: [
              {
                value: "MARKET",
                label: "Market",
                color: "blue",
                icon: "mdi:chart-line",
              },
              {
                value: "LIMIT",
                label: "Limit",
                color: "green",
                icon: "mdi:chart-bell-curve",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Row #4: Additional Time-In-Force KPIs (2x2) on the left + TIF Pie Chart on the right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "gtc_orders",
          title: "GTC Orders",
          metric: "GTC",
          model: "exchangeOrder",
          aggregation: { field: "timeInForce", value: "GTC" },
          icon: "mdi:timer-sand",
        },
        {
          id: "ioc_orders",
          title: "IOC Orders",
          metric: "IOC",
          model: "exchangeOrder",
          aggregation: { field: "timeInForce", value: "IOC" },
          icon: "mdi:timer-sand-full",
        },
        {
          id: "fok_orders",
          title: "FOK Orders",
          metric: "FOK",
          model: "exchangeOrder",
          aggregation: { field: "timeInForce", value: "FOK" },
          icon: "mdi:timer-alert",
        },
        {
          id: "po_orders",
          title: "PO Orders",
          metric: "PO",
          model: "exchangeOrder",
          aggregation: { field: "timeInForce", value: "PO" },
          icon: "mdi:timer-cog",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "exchangeOrderTimeInForceDistribution",
          title: "Time-In-Force Distribution",
          type: "pie",
          model: "exchangeOrder",
          metrics: ["GTC", "IOC", "FOK", "PO"],
          config: {
            field: "timeInForce",
            status: [
              {
                value: "GTC",
                label: "GTC",
                color: "blue",
                icon: "mdi:timer-sand",
              },
              {
                value: "IOC",
                label: "IOC",
                color: "green",
                icon: "mdi:timer-sand-full",
              },
              {
                value: "FOK",
                label: "FOK",
                color: "amber",
                icon: "mdi:timer-alert",
              },
              { value: "PO", label: "PO", color: "red", icon: "mdi:timer-cog" },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Row #5: Full-width line chart (no array)
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "exchangeOrdersOverTime",
        title: "Orders Over Time",
        type: "line",
        model: "exchangeOrder",
        metrics: ["total", "OPEN", "CLOSED", "CANCELED", "EXPIRED", "REJECTED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total",
          OPEN: "Open",
          CLOSED: "Closed",
          CANCELED: "Canceled",
          EXPIRED: "Expired",
          REJECTED: "Rejected",
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Row #6: Full-width stacked area chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart",
    items: [
      {
        id: "buyVsSellOverTime",
        title: "Buy vs. Sell Over Time",
        type: "stackedArea",
        model: "exchangeOrder",
        metrics: ["buy", "sell"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          buy: "Buy",
          sell: "Sell",
        },
      },
    ],
  },
];
