"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
  // ─────────────────────────────────────────────────────────────
  // Group 1: Ticket Status Overview – KPI Grid & Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi" as const,
      layout: { cols: 3, rows: 2 },
      responsive: {
        mobile: { cols: 1, rows: 5, span: 1 },
        tablet: { cols: 3, rows: 2, span: 2 },
        desktop: { cols: 3, rows: 2, span: 2 }
      },
      items: [
        {
          id: "total_tickets",
          title: tCommon("total_tickets"),
          metric: "total",
          model: "supportTicket",
          icon: "Ticket",
        },
        {
          id: "pending_tickets",
          title: t("pending_tickets"),
          metric: "pending",
          model: "supportTicket",
          aggregation: { field: "status", value: "PENDING" },
          icon: "Hourglass",
        },
        {
          id: "open_tickets",
          title: tCommon("open_tickets"),
          metric: "open",
          model: "supportTicket",
          aggregation: { field: "status", value: "OPEN" },
          icon: "FolderOpen",
        },
        {
          id: "replied_tickets",
          title: tCommon("replied"),
          metric: "replied",
          model: "supportTicket",
          aggregation: { field: "status", value: "REPLIED" },
          icon: "MessageCircle",
        },
        {
          id: "closed_tickets",
          title: t("closed_tickets"),
          metric: "closed",
          model: "supportTicket",
          aggregation: { field: "status", value: "CLOSED" },
          icon: "CheckCircle2",
        },
      ],
    },
    {
      type: "chart" as const,
      responsive: {
        mobile: { cols: 1 },
        tablet: { cols: 1 },
        desktop: { cols: 1 }
      },
      items: [
        {
          id: "ticketStatusDistribution",
          title: t("ticket_status_distribution"),
          type: "pie" as const,
          model: "supportTicket",
          metrics: ["pending", "open", "replied", "closed"],
          config: {
            field: "status",
            status: [
              {
                value: "PENDING",
                label: tCommon("pending"),
                color: "amber", // mapped in your colorMap
                icon: "mdi:clock-outline",
              },
              {
                value: "OPEN",
                label: tCommon("open"),
                color: "blue",
                icon: "mdi:folder-open",
              },
              {
                value: "REPLIED",
                label: tCommon("replied"),
                color: "teal",
                icon: "mdi:message-reply",
              },
              {
                value: "CLOSED",
                label: tCommon("closed"),
                color: "red",
                icon: "mdi:check-circle",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 2: Ticket Importance Overview – KPI Grid & Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi" as const,
      layout: { cols: 3, rows: 1 },
      responsive: {
        mobile: { cols: 1, rows: 3, span: 1 },
        tablet: { cols: 3, rows: 1, span: 2 },
        desktop: { cols: 3, rows: 1, span: 2 }
      },
      items: [
        {
          id: "low_importance_tickets",
          title: tCommon("low"),
          metric: "LOW",
          model: "supportTicket",
          aggregation: { field: "importance", value: "LOW" },
          icon: "ArrowDown",
        },
        {
          id: "medium_importance_tickets",
          title: tCommon("medium"),
          metric: "MEDIUM",
          model: "supportTicket",
          aggregation: { field: "importance", value: "MEDIUM" },
          icon: "Minus",
        },
        {
          id: "high_importance_tickets",
          title: tCommon("high"),
          metric: "HIGH",
          model: "supportTicket",
          aggregation: { field: "importance", value: "HIGH" },
          icon: "ArrowUp",
        },
      ],
    },
    {
      type: "chart" as const,
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 1, span: 1 },
        desktop: { cols: 1, span: 1 }
      },
      items: [
        {
          id: "ticketImportanceDistribution",
          title: t("ticket_importance_distribution"),
          type: "pie" as const,
          model: "supportTicket",
          metrics: ["LOW", "MEDIUM", "HIGH"],
          config: {
            field: "importance",
            status: [
              {
                value: "LOW",
                label: tCommon("low"),
                color: "green",
                icon: "mdi:arrow-down",
              },
              {
                value: "MEDIUM",
                label: tCommon("medium"),
                color: "blue",
                icon: "mdi:arrow-split-vertical",
              },
              {
                value: "HIGH",
                label: tCommon("high"),
                color: "red",
                icon: "mdi:arrow-up-bold",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 3: Ticket Type Overview – KPI Grid & Pie Chart
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi" as const,
      layout: { cols: 2, rows: 1 },
      responsive: {
        mobile: { cols: 1, rows: 2, span: 1 },
        tablet: { cols: 2, rows: 1, span: 2 },
        desktop: { cols: 2, rows: 1, span: 2 }
      },
      items: [
        {
          id: "live_tickets",
          title: t("live_tickets"),
          metric: "LIVE",
          model: "supportTicket",
          aggregation: { field: "type", value: "LIVE" },
          icon: "MessageCircle",
        },
        {
          id: "ticket_tickets",
          title: tCommon("ticket"),
          metric: "TICKET",
          model: "supportTicket",
          aggregation: { field: "type", value: "TICKET" },
          icon: "Ticket",
        },
      ],
    },
    {
      type: "chart" as const,
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 1, span: 1 },
        desktop: { cols: 1, span: 1 }
      },
      items: [
        {
          id: "ticketTypeDistribution",
          title: t("ticket_type_distribution"),
          type: "pie" as const,
          model: "supportTicket",
          metrics: ["LIVE", "TICKET"],
          config: {
            field: "type",
            status: [
              {
                value: "LIVE",
                label: tCommon("live"),
                color: "green",
                icon: "mdi:message-text",
              },
              {
                value: "TICKET",
                label: tCommon("ticket"),
                color: "blue",
                icon: "mdi:ticket",
              },
            ],
          },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Group 4: Tickets Over Time – Full-Width Line Chart
  // ─────────────────────────────────────────────────────────────
  {
    type: "chart" as const,
    responsive: {
      mobile: { cols: 1, span: 1 },
      tablet: { cols: 1, span: 1 },
      desktop: { cols: 1, span: 1 }
    },
    items: [
      {
        id: "ticketCreationOverTime",
        title: t("tickets_over_time"),
        type: "line" as const,
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
] as AnalyticsConfig;
}
