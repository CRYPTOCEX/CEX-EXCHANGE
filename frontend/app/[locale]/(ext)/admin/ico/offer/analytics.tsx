import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const analytics: AnalyticsConfig = [
  // Row 1: Comprehensive KPI Cards + Status Distribution Pie Chart
  [
    {
      type: "kpi",
      layout: { cols: 3, rows: 3 },
      responsive: {
        mobile: { cols: 1, rows: 9, span: 1 },
          tablet: { cols: 2, rows: 5, span: 2 },
          desktop: { cols: 3, rows: 3, span: 2 },
      },
      items: [
        {
          id: "total_offerings",
          title: "Total Offerings",
          metric: "total",
          model: "icoTokenOffering",
          icon: "FileText",
        },
        {
          id: "active_offerings",
          title: "Active Offerings",
          metric: "active",
          model: "icoTokenOffering",
          aggregation: { field: "status", value: "ACTIVE" },
          icon: "CheckSquare",
        },
        {
          id: "success_offerings",
          title: "Successful Offerings",
          metric: "success",
          model: "icoTokenOffering",
          aggregation: { field: "status", value: "SUCCESS" },
          icon: "CheckCircle",
        },
        {
          id: "failed_offerings",
          title: "Failed Offerings",
          metric: "failed",
          model: "icoTokenOffering",
          aggregation: { field: "status", value: "FAILED" },
          icon: "XCircle",
        },
        {
          id: "upcoming_offerings",
          title: "Upcoming Offerings",
          metric: "upcoming",
          model: "icoTokenOffering",
          aggregation: { field: "status", value: "UPCOMING" },
          icon: "Clock",
        },
        {
          id: "pending_offerings",
          title: "Pending Approval",
          metric: "pending",
          model: "icoTokenOffering",
          aggregation: { field: "status", value: "PENDING" },
          icon: "Hourglass",
        },
        {
          id: "rejected_offerings",
          title: "Rejected Offerings",
          metric: "rejected",
          model: "icoTokenOffering",
          aggregation: { field: "status", value: "REJECTED" },
          icon: "AlertCircle",
        },
        {
          id: "disabled_offerings",
          title: "Disabled Offerings",
          metric: "disabled",
          model: "icoTokenOffering",
          aggregation: { field: "status", value: "DISABLED" },
          icon: "Ban",
        },
        {
          id: "featured_offerings",
          title: "Featured Offerings",
          metric: "featured",
          model: "icoTokenOffering",
          aggregation: { field: "featured", value: true },
          icon: "Star",
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
          id: "offeringStatusDistribution",
          title: "Offering Status Distribution",
          type: "pie",
          model: "icoTokenOffering",
          metrics: [
            "active",
            "success",
            "failed",
            "upcoming",
            "pending",
            "rejected",
            "disabled",
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
                value: "SUCCESS",
                label: "Success",
                color: "blue",
                icon: "mdi:check-all",
              },
              {
                value: "FAILED",
                label: "Failed",
                color: "red",
                icon: "mdi:close-circle",
              },
              {
                value: "UPCOMING",
                label: "Upcoming",
                color: "amber",
                icon: "mdi:clock-outline",
              },
              {
                value: "PENDING",
                label: "Pending",
                color: "gray",
                icon: "mdi:clock-alert",
              },
              {
                value: "REJECTED",
                label: "Rejected",
                color: "red",
                icon: "mdi:alert-circle",
              },
              {
                value: "DISABLED",
                label: "Disabled",
                color: "gray",
                icon: "mdi:cancel",
              },
            ],
          },
        },
      ],
    },
  ],
  // Row 2: Financial & Operational KPIs + Boolean Metrics Pie Chart
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
          id: "target_amount",
          title: "Total Target Amount",
          metric: "sum_target",
          model: "icoTokenOffering",
          icon: "DollarSign",
        },
        {
          id: "total_participants",
          title: "Total Participants",
          metric: "sum_participants",
          model: "icoTokenOffering",
          icon: "Users",
        },
        {
          id: "paused_offerings",
          title: "Paused Offerings",
          metric: "paused",
          model: "icoTokenOffering",
          aggregation: { field: "isPaused", value: true },
          icon: "Pause",
        },
        {
          id: "flagged_offerings",
          title: "Flagged Offerings",
          metric: "flagged",
          model: "icoTokenOffering",
          aggregation: { field: "isFlagged", value: true },
          icon: "Flag",
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
          title: "Payment Wallet Type Distribution",
          type: "pie",
          model: "icoTokenOffering",
          metrics: ["FIAT", "SPOT", "ECO"],
          config: {
            field: "purchaseWalletType",
            status: [
              {
                value: "FIAT",
                label: "Fiat",
                color: "amber",
                icon: "mdi:currency-usd",
              },
              {
                value: "SPOT",
                label: "Spot",
                color: "blue",
                icon: "mdi:wallet",
              },
              {
                value: "ECO",
                label: "Ecosystem",
                color: "green",
                icon: "mdi:leaf",
              },
            ],
          },
        },
      ],
    },
  ],
  // Row 3: Success/Failure Rate Chart + Time Series Trends
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
          id: "successFailureRate",
          title: "Success vs Failure Rate",
          type: "pie",
          model: "icoTokenOffering",
          metrics: ["success", "failed", "active"],
          config: {
            field: "status",
            status: [
              {
                value: "SUCCESS",
                label: "Successful",
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
                value: "ACTIVE",
                label: "In Progress",
                color: "blue",
                icon: "mdi:progress-clock",
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
          id: "offeringsOverTime",
          title: "Offerings Over Time",
          type: "line",
          model: "icoTokenOffering",
          metrics: ["total", "active", "success", "failed"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Offerings",
            active: "Active",
            success: "Successful",
            failed: "Failed",
          },
        },
      ],
    },
  ],
  // Row 4: Participant Trends + Featured vs Non-Featured Analytics
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
          id: "participantsTrends",
          title: "Participant Growth Over Time",
          type: "line",
          model: "icoTokenOffering",
          metrics: ["sum_participants"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            sum_participants: "Total Participants",
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
          id: "featuredVsNonFeatured",
          title: "Featured vs Non-Featured",
          type: "pie",
          model: "icoTokenOffering",
          metrics: ["featured", "non_featured"],
          config: {
            field: "featured",
            status: [
              {
                value: true,
                label: "Featured",
                color: "blue",
                icon: "mdi:star",
              },
              {
                value: false,
                label: "Non-Featured",
                color: "gray",
                icon: "mdi:star-outline",
              },
            ],
          },
        },
      ],
    },
  ],
];
