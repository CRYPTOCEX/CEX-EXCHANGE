import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const futuresOrderAnalytics: AnalyticsConfig = [
  // Row 1: Status KPIs + Pie
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_orders",
          title: "Total Futures Orders",
          metric: "total",
          model: "orders",
          icon: "mdi:finance",
        },
        {
          id: "open_orders",
          title: "Open Orders",
          metric: "OPEN",
          model: "orders",
          aggregation: { field: "status", value: "OPEN" },
          icon: "mdi:door-open",
        },
        {
          id: "closed_orders",
          title: "Closed Orders",
          metric: "CLOSED",
          model: "orders",
          aggregation: { field: "status", value: "CLOSED" },
          icon: "mdi:door-closed",
        },
        {
          id: "cancelled_orders",
          title: "Cancelled Orders",
          metric: "CANCELLED",
          model: "orders",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "mdi:cancel",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "futuresOrderStatusDistribution",
          title: "Futures Status Distribution",
          type: "pie",
          model: "orders",
          metrics: ["OPEN", "CLOSED", "CANCELLED"],
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
                value: "CANCELLED",
                label: "Cancelled",
                color: "amber",
                icon: "mdi:cancel",
              },
            ],
          },
        },
      ],
    },
  ],

  // Row 2: Side KPIs + Pie
  [
    {
      type: "kpi",
      layout: { cols: 1, rows: 2 },
      items: [
        {
          id: "buy_orders",
          title: "Buy Orders",
          metric: "BUY",
          model: "orders",
          aggregation: { field: "side", value: "BUY" },
          icon: "mdi:cart-arrow-down",
        },
        {
          id: "sell_orders",
          title: "Sell Orders",
          metric: "SELL",
          model: "orders",
          aggregation: { field: "side", value: "SELL" },
          icon: "mdi:cart-arrow-up",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "futuresOrderSideDistribution",
          title: "Side Distribution",
          type: "pie",
          model: "orders",
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

  // Row 3: Type KPIs + Pie
  [
    {
      type: "kpi",
      layout: { cols: 1, rows: 2 },
      items: [
        {
          id: "market_orders",
          title: "Market Orders",
          metric: "MARKET",
          model: "orders",
          aggregation: { field: "type", value: "MARKET" },
          icon: "mdi:chart-line",
        },
        {
          id: "limit_orders",
          title: "Limit Orders",
          metric: "LIMIT",
          model: "orders",
          aggregation: { field: "type", value: "LIMIT" },
          icon: "mdi:chart-bell-curve",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "futuresOrderTypeDistribution",
          title: "Order Type Distribution",
          type: "pie",
          model: "orders",
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

  // Row 4: Time-In-Force KPIs + Pie
  [
    {
      type: "kpi",
      layout: { cols: 1, rows: 2 },
      items: [
        {
          id: "gtc_orders",
          title: "GTC Orders",
          metric: "GTC",
          model: "orders",
          aggregation: { field: "timeInForce", value: "GTC" },
          icon: "mdi:timer-sand",
        },
        {
          id: "ioc_orders",
          title: "IOC Orders",
          metric: "IOC",
          model: "orders",
          aggregation: { field: "timeInForce", value: "IOC" },
          icon: "mdi:timer-sand-full",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "futuresOrderTimeInForceDistribution",
          title: "Time-In-Force Distribution",
          type: "pie",
          model: "orders",
          metrics: ["GTC", "IOC"],
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
            ],
          },
        },
      ],
    },
  ],

  // Row 5: Orders Over Time
  {
    type: "chart",
    items: [
      {
        id: "futuresOrdersOverTime",
        title: "Futures Orders Over Time",
        type: "line",
        model: "orders",
        metrics: ["total", "OPEN", "CLOSED", "CANCELLED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total",
          OPEN: "Open",
          CLOSED: "Closed",
          CANCELLED: "Cancelled",
        },
      },
    ],
  },

  // Row 6: Buy vs Sell Over Time
  {
    type: "chart",
    items: [
      {
        id: "futuresBuyVsSellOverTime",
        title: "Buy vs Sell Over Time",
        type: "stackedArea",
        model: "orders",
        metrics: ["BUY", "SELL"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          BUY: "Buy",
          SELL: "Sell",
        },
      },
    ],
  },
];
