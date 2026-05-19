import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const analytics: AnalyticsConfig = [
  // First row: Status KPIs and Status Distribution Chart
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
          id: "total_pools",
          title: "Total Pools",
          metric: "total",
          model: "stakingPool",
          icon: "Database",
        },
        {
          id: "active_pools",
          title: "Active Pools",
          metric: "active",
          model: "stakingPool",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "CheckCircle",
        },
        {
          id: "inactive_pools",
          title: "Inactive Pools",
          metric: "inactive",
          model: "stakingPool",
          aggregation: { field: "status", value: "INACTIVE" },
          icon: "XCircle",
        },
        {
          id: "coming_soon_pools",
          title: "Coming Soon",
          metric: "comingSoon",
          model: "stakingPool",
          aggregation: { field: "status", value: "COMING_SOON" },
          icon: "Clock",
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
          id: "poolStatusDistribution",
          title: "Pool Status Distribution",
          type: "pie",
          model: "stakingPool",
          metrics: ["active", "inactive", "comingSoon"],
          config: {
            field: "status",
            status: [
              {
                value: "ACTIVE",
                label: "Active",
                color: "green",
                icon: "mdi:check",
              },
              {
                value: "INACTIVE",
                label: "Inactive",
                color: "gray",
                icon: "mdi:close",
              },
              {
                value: "COMING_SOON",
                label: "Coming Soon",
                color: "blue",
                icon: "mdi:clock",
              },
            ],
          },
        },
      ],
    },
  ],
  // Second row: Wallet Type and Earning Frequency Distribution
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
          id: "walletTypeDistribution",
          title: "Wallet Type Distribution",
          type: "pie",
          model: "stakingPool",
          metrics: ["fiat", "spot", "eco"],
          config: {
            field: "walletType",
            status: [
              {
                value: "FIAT",
                label: "Fiat",
                color: "blue",
                icon: "mdi:cash",
              },
              {
                value: "SPOT",
                label: "Spot",
                color: "green",
                icon: "mdi:wallet",
              },
              {
                value: "ECO",
                label: "Eco",
                color: "amber",
                icon: "mdi:leaf",
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
          id: "earningFrequencyDistribution",
          title: "Earning Frequency Distribution",
          type: "pie",
          model: "stakingPool",
          metrics: ["daily", "weekly", "monthly", "endOfTerm"],
          config: {
            field: "earningFrequency",
            status: [
              {
                value: "DAILY",
                label: "Daily",
                color: "green",
                icon: "mdi:calendar-today",
              },
              {
                value: "WEEKLY",
                label: "Weekly",
                color: "blue",
                icon: "mdi:calendar-week",
              },
              {
                value: "MONTHLY",
                label: "Monthly",
                color: "violet",
                icon: "mdi:calendar-month",
              },
              {
                value: "END_OF_TERM",
                label: "End of Term",
                color: "amber",
                icon: "mdi:calendar-end",
              },
            ],
          },
        },
      ],
    },
  ],
  // Third row: Financial Metrics KPIs
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
          id: "promoted_pools",
          title: "Promoted Pools",
          metric: "promoted",
          model: "stakingPool",
          aggregation: { field: "isPromoted", value: true },
          icon: "Star",
        },
        {
          id: "auto_compound_pools",
          title: "Auto Compound Pools",
          metric: "autoCompound",
          model: "stakingPool",
          aggregation: { field: "autoCompound", value: true },
          icon: "RefreshCw",
        },
        {
          id: "avg_apr",
          title: "Average APR",
          metric: "avgApr",
          model: "stakingPool",
          aggregation: { field: "apr", aggregationType: "avg" },
          icon: "TrendingUp",
          format: "percentage",
        },
        {
          id: "total_available_stake",
          title: "Total Available to Stake",
          metric: "totalAvailableStake",
          model: "stakingPool",
          aggregation: { field: "availableToStake", aggregationType: "sum" },
          icon: "DollarSign",
          format: "currency",
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
          id: "promotedVsRegular",
          title: "Promoted vs Regular Pools",
          type: "pie",
          model: "stakingPool",
          metrics: ["promoted", "regular"],
          config: {
            field: "isPromoted",
            status: [
              {
                value: true,
                label: "Promoted",
                color: "yellow",
                icon: "mdi:star",
              },
              {
                value: false,
                label: "Regular",
                color: "gray",
                icon: "mdi:circle-outline",
              },
            ],
          },
        },
      ],
    },
  ],
  // Fourth row: Lock Period and APR Analytics
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
          id: "aprDistribution",
          title: "APR Distribution",
          type: "bar",
          model: "stakingPool",
          metrics: ["apr"],
          config: {
            field: "apr",
            groupBy: "apr",
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
          id: "autoCompoundDistribution",
          title: "Auto Compound Distribution",
          type: "pie",
          model: "stakingPool",
          metrics: ["autoCompoundEnabled", "autoCompoundDisabled"],
          config: {
            field: "autoCompound",
            status: [
              {
                value: true,
                label: "Enabled",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: false,
                label: "Disabled",
                color: "gray",
                icon: "mdi:close-circle",
              },
            ],
          },
        },
      ],
    },
  ],
  // Fifth row: Time Series
  {
    type: "chart",
    responsive: {
      mobile: { cols: 1, rows: 1, span: 1 },
      tablet: { cols: 1, rows: 1, span: 1 },
      desktop: { cols: 1, rows: 1, span: 1 },
    },
    items: [
      {
        id: "poolsOverTime",
        title: "Pools Created Over Time",
        type: "line",
        model: "stakingPool",
        metrics: ["total"],
        timeframes: ["7d", "30d", "3m", "6m", "y"],
        labels: { total: "Total Pools" },
      },
    ],
  },
];
