import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const offersAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Offer Overview - KPI Grid on Left, Status Pie Chart on Right
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      layout: { cols: 4, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 8, span: 1 },
          tablet: { cols: 2, rows: 4, span: 2 },
          desktop: { cols: 4, rows: 2, span: 2 },
      },
      items: [
        {
          id: "total_offers",
          title: "Total Offers",
          metric: "total",
          model: "p2pOffer",
          icon: "mdi:ticket-outline",
        },
        {
          id: "active_offers",
          title: "Active Offers",
          metric: "ACTIVE",
          model: "p2pOffer",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "mdi:check-circle",
        },
        {
          id: "pending_approval_offers",
          title: "Pending Approval",
          metric: "PENDING_APPROVAL",
          model: "p2pOffer",
          aggregation: { field: "status", value: "PENDING_APPROVAL" },
          icon: "mdi:clock-alert-outline",
        },
        {
          id: "draft_offers",
          title: "Draft Offers",
          metric: "DRAFT",
          model: "p2pOffer",
          aggregation: { field: "status", value: "DRAFT" },
          icon: "mdi:file-document-edit-outline",
        },
        {
          id: "paused_offers",
          title: "Paused Offers",
          metric: "PAUSED",
          model: "p2pOffer",
          aggregation: { field: "status", value: "PAUSED" },
          icon: "mdi:pause-circle",
        },
        {
          id: "completed_offers",
          title: "Completed Offers",
          metric: "COMPLETED",
          model: "p2pOffer",
          aggregation: { field: "status", value: "COMPLETED" },
          icon: "mdi:check-all",
        },
        {
          id: "cancelled_offers",
          title: "Cancelled Offers",
          metric: "CANCELLED",
          model: "p2pOffer",
          aggregation: { field: "status", value: "CANCELLED" },
          icon: "mdi:close-circle",
        },
        {
          id: "rejected_offers",
          title: "Rejected Offers",
          metric: "REJECTED",
          model: "p2pOffer",
          aggregation: { field: "status", value: "REJECTED" },
          icon: "mdi:alert-circle",
        },
        {
          id: "expired_offers",
          title: "Expired Offers",
          metric: "EXPIRED",
          model: "p2pOffer",
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
          id: "offerStatusDistribution",
          title: "Offer Status Distribution",
          type: "pie",
          model: "p2pOffer",
          metrics: [
            "ACTIVE",
            "PENDING_APPROVAL",
            "DRAFT",
            "PAUSED",
            "COMPLETED",
            "CANCELLED",
            "REJECTED",
            "EXPIRED",
          ],
          config: {
            field: "status",
            status: [
              {
                value: "ACTIVE",
                label: "Active",
                color: "green",
                icon: "mdi:check-circle",
              },
              {
                value: "PENDING_APPROVAL",
                label: "Pending Approval",
                color: "amber",
                icon: "mdi:clock-alert-outline",
              },
              {
                value: "DRAFT",
                label: "Draft",
                color: "gray",
                icon: "mdi:file-document-edit-outline",
              },
              {
                value: "PAUSED",
                label: "Paused",
                color: "blue",
                icon: "mdi:pause-circle",
              },
              {
                value: "COMPLETED",
                label: "Completed",
                color: "teal",
                icon: "mdi:check-all",
              },
              {
                value: "CANCELLED",
                label: "Cancelled",
                color: "orange",
                icon: "mdi:close-circle",
              },
              {
                value: "REJECTED",
                label: "Rejected",
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
  // Group 2: Offer Type & Wallet Distribution
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
          id: "offerTypeDistribution",
          title: "Buy vs Sell Offers",
          type: "pie",
          model: "p2pOffer",
          metrics: ["BUY", "SELL"],
          config: {
            field: "type",
            status: [
              {
                value: "BUY",
                label: "Buy Offers",
                color: "green",
                icon: "mdi:arrow-down-circle",
              },
              {
                value: "SELL",
                label: "Sell Offers",
                color: "red",
                icon: "mdi:arrow-up-circle",
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
          id: "walletTypeDistribution",
          title: "Wallet Type Distribution",
          type: "pie",
          model: "p2pOffer",
          metrics: ["FIAT", "SPOT", "ECO"],
          config: {
            field: "walletType",
            status: [
              {
                value: "FIAT",
                label: "Fiat Wallet",
                color: "blue",
                icon: "mdi:cash",
              },
              {
                value: "SPOT",
                label: "Spot Wallet",
                color: "violet",
                icon: "mdi:wallet",
              },
              {
                value: "ECO",
                label: "Eco Wallet",
                color: "green",
                icon: "mdi:leaf",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Offers Over Time - Full-Width Line Chart
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
        id: "offersOverTime",
        title: "Offers Over Time",
        type: "line",
        model: "p2pOffer",
        metrics: ["total", "ACTIVE", "PENDING_APPROVAL", "COMPLETED"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          total: "Total Offers",
          ACTIVE: "Active Offers",
          PENDING_APPROVAL: "Pending Approval",
          COMPLETED: "Completed Offers",
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Group 4: Engagement Metrics - Views Analytics
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
        id: "offerViewsOverTime",
        title: "Offer Views Over Time",
        type: "line",
        model: "p2pOffer",
        metrics: ["views"],
        timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
        labels: {
          views: "Total Views",
        },
      },
    ],
  },
];
