import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

export const supportTicketAnalytics: AnalyticsConfig = [
  // 1) A row of KPI cards + a pie chart
  [
    {
      type: "kpi",
      layout: { cols: 2, rows: 2 },
      items: [
        {
          id: "total_tickets",
          title: "Total Tickets",
          metric: "total",
          model: "supportTicket",
          icon: "Ticket",
        },
        {
          id: "pending_tickets",
          title: "Pending Tickets",
          metric: "pending",
          model: "supportTicket",
          // Tells the aggregator: “count all where status = 'PENDING'”
          aggregation: { field: "status", value: "PENDING" },
          icon: "Hourglass",
        },
        {
          id: "open_tickets",
          title: "Open Tickets",
          metric: "open",
          model: "supportTicket",
          aggregation: { field: "status", value: "OPEN" },
          icon: "FolderOpen",
        },
        {
          id: "closed_tickets",
          title: "Closed Tickets",
          metric: "closed",
          model: "supportTicket",
          aggregation: { field: "status", value: "CLOSED" },
          icon: "CheckCircle2",
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "ticketStatusDistribution",
          title: "Ticket Status Distribution",
          type: "pie",
          model: "supportTicket",
          metrics: ["pending", "open", "replied", "closed"],
          config: {
            field: "status",
            status: [
              {
                value: "PENDING",
                label: "Pending",
                color: "amber", // mapped in your colorMap
                icon: "mdi:clock-outline",
              },
              {
                value: "OPEN",
                label: "Open",
                color: "blue",
                icon: "mdi:folder-open",
              },
              {
                value: "REPLIED",
                label: "Replied",
                color: "teal",
                icon: "mdi:message-reply",
              },
              {
                value: "CLOSED",
                label: "Closed",
                color: "red",
                icon: "mdi:check-circle",
              },
            ],
          },
        },
      ],
    },
  ],
  // 2) Another row with a chart for importance distribution + line chart
  [
    {
      type: "chart",
      items: [
        {
          id: "ticketImportanceDistribution",
          title: "Ticket Importance Distribution",
          type: "pie",
          model: "supportTicket",
          metrics: ["LOW", "MEDIUM", "HIGH"],
          config: {
            field: "importance",
            status: [
              {
                value: "LOW",
                label: "Low",
                color: "green",
                icon: "mdi:arrow-down",
              },
              {
                value: "MEDIUM",
                label: "Medium",
                color: "info", // or "blue" if you prefer
                icon: "mdi:arrow-split-vertical",
              },
              {
                value: "HIGH",
                label: "High",
                color: "red",
                icon: "mdi:arrow-up-bold",
              },
            ],
          },
        },
      ],
    },
    {
      type: "chart",
      items: [
        {
          id: "ticketCreationOverTime",
          title: "Tickets Over Time",
          type: "line",
          model: "supportTicket",
          metrics: ["total", "pending", "open", "replied", "closed"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Total Tickets",
            pending: "Pending",
            open: "Open",
            replied: "Replied",
            closed: "Closed",
          },
        },
      ],
    },
  ],
];
