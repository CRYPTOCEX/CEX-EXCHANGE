import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const disputeAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Dispute Overview - KPI Grid on Left, Status Pie Chart on Right
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
          id: "total_disputes",
          title: "Total Disputes",
          metric: "total",
          model: "p2pDispute",
          icon: "mdi:alert-octagon",
        },
        {
          id: "pending_disputes",
          title: "Pending Disputes",
          metric: "PENDING",
          model: "p2pDispute",
          aggregation: { field: "status", value: "PENDING" },
          icon: "mdi:clock-alert",
        },
        {
          id: "in_progress_disputes",
          title: "In Progress",
          metric: "IN_PROGRESS",
          model: "p2pDispute",
          aggregation: { field: "status", value: "IN_PROGRESS" },
          icon: "mdi:progress-clock",
        },
        {
          id: "resolved_disputes",
          title: "Resolved Disputes",
          metric: "RESOLVED",
          model: "p2pDispute",
          aggregation: { field: "status", value: "RESOLVED" },
          icon: "mdi:check-circle",
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
          id: "disputeStatusDistribution",
          title: "Dispute Status Distribution",
          type: "pie",
          model: "p2pDispute",
          metrics: ["PENDING", "IN_PROGRESS", "RESOLVED"],
          config: {
            field: "status",
            status: [
              {
                value: "PENDING",
                label: "Pending",
                color: "amber",
                icon: "mdi:clock-alert",
              },
              {
                value: "IN_PROGRESS",
                label: "In Progress",
                color: "blue",
                icon: "mdi:progress-clock",
              },
              {
                value: "RESOLVED",
                label: "Resolved",
                color: "green",
                icon: "mdi:check-circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Priority Distribution - KPI Cards on Left, Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 3, span: 1 },
          tablet: { cols: 2, rows: 2, span: 2 },
          desktop: { cols: 2, rows: 2, span: 2 },
      },
      items: [
        {
          id: "high_priority_disputes",
          title: "High Priority",
          metric: "HIGH",
          model: "p2pDispute",
          aggregation: { field: "priority", value: "HIGH" },
          icon: "mdi:alert-circle",
        },
        {
          id: "medium_priority_disputes",
          title: "Medium Priority",
          metric: "MEDIUM",
          model: "p2pDispute",
          aggregation: { field: "priority", value: "MEDIUM" },
          icon: "mdi:alert-outline",
        },
        {
          id: "low_priority_disputes",
          title: "Low Priority",
          metric: "LOW",
          model: "p2pDispute",
          aggregation: { field: "priority", value: "LOW" },
          icon: "mdi:information-outline",
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
          id: "priorityDistribution",
          title: "Priority Distribution",
          type: "pie",
          model: "p2pDispute",
          metrics: ["HIGH", "MEDIUM", "LOW"],
          config: {
            field: "priority",
            status: [
              {
                value: "HIGH",
                label: "High Priority",
                color: "red",
                icon: "mdi:alert-circle",
              },
              {
                value: "MEDIUM",
                label: "Medium Priority",
                color: "orange",
                icon: "mdi:alert-outline",
              },
              {
                value: "LOW",
                label: "Low Priority",
                color: "green",
                icon: "mdi:information-outline",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Disputes Over Time - Full-Width Line Chart
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
        id: "disputesOverTime",
        title: "Disputes Over Time",
        type: "line",
        model: "p2pDispute",
        metrics: ["total", "PENDING", "IN_PROGRESS", "RESOLVED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Disputes",
          PENDING: "Pending Disputes",
          IN_PROGRESS: "In Progress",
          RESOLVED: "Resolved Disputes",
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 4: Priority & Resolution Analytics Over Time
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
          id: "priorityTrendsOverTime",
          title: "Priority Trends Over Time",
          type: "line",
          model: "p2pDispute",
          metrics: ["HIGH", "MEDIUM", "LOW"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            HIGH: "High Priority",
            MEDIUM: "Medium Priority",
            LOW: "Low Priority",
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
          id: "resolutionRateOverTime",
          title: "Resolution Rate Over Time",
          type: "line",
          model: "p2pDispute",
          metrics: ["RESOLVED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            RESOLVED: "Resolution Rate",
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 5: Dispute Rate Analytics (Related to Trades)
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
        id: "disputeRateAnalysis",
        title: "Dispute Rate Analysis",
        type: "line",
        model: "p2pDispute",
        metrics: ["total", "HIGH"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Disputes",
          HIGH: "High Priority Disputes",
        },
      },
    ],
  },
];
