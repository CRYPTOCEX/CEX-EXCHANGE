"use client";
import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

import { useTranslations } from "next-intl";
export function useAnalytics() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
    // ─────────────────────────────────────────────────────────────
    // Row 1 — the morning check.
    //
    // What is waiting, how long the worst of it has been waiting, what
    // nobody owns, what is on fire, how fast we answer and how often we
    // miss. `responseTime` and `satisfaction` are real columns the desk's
    // own stat route already averages; until recently no analytics card
    // read either of them.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi" as const,
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 3, span: 2 },
        },
        items: [
          {
            id: "open_backlog",
            title: tCommon("open_tickets"),
            metric: "backlog",
            model: "supportTicket",
            // Lifetime, not this window: a queue is a stock. A ticket opened
            // last quarter and still unanswered is exactly the row that
            // matters, and the old period-scoped count hid it.
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "status", op: "!=", value: "CLOSED" }],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "FolderOpen",
          },
          {
            id: "oldest_open_ticket",
            title: t("oldest_open_ticket"),
            metric: "oldestOpenAge",
            model: "supportTicket",
            // MAX(TIMESTAMPDIFF(HOUR, createdAt, NOW())) over everything not
            // closed — the age of the single worst-served customer on the
            // desk. A backlog COUNT can look flat while one ticket quietly
            // ages for a month; this is the number that catches that.
            //
            // Hours, because `format: "duration"` reads its input as hours
            // and rolls up to days past 48 on its own.
            aggregation: {
              field: "createdAt",
              op: "max",
              since: { unit: "h" },
              where: [{ field: "status", op: "!=", value: "CLOSED" }],
            },
            valueMode: "current",
            format: "duration",
            invert: true,
            icon: "Hourglass",
          },
          {
            id: "unassigned_tickets",
            title: tCommon("unassigned"),
            metric: "unassigned",
            model: "supportTicket",
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "agentId", value: null },
                { field: "status", op: "!=", value: "CLOSED" },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "UserX",
          },
          {
            id: "high_priority_open",
            title: t("high_priority_open"),
            metric: "highPriorityOpen",
            model: "supportTicket",
            aggregation: {
              op: "count",
              field: "id",
              where: [
                { field: "importance", value: "HIGH" },
                { field: "status", op: "!=", value: "CLOSED" },
              ],
            },
            valueMode: "current",
            format: "number",
            invert: true,
            icon: "AlertTriangle",
          },
          {
            id: "avg_first_response",
            title: t("avg_first_response_min"),
            metric: "avgResponse",
            model: "supportTicket",
            // `>= 0`, not `> 0`. A reply inside the same minute rounds to 0 —
            // the best outcome the desk can produce — and the old guard read
            // that as "not measured" and dropped it, so this average was taken
            // over the slower half of the work only. Rows that were never
            // answered hold NULL, which fails `>= 0` and is still excluded.
            aggregation: {
              field: "responseTime",
              op: "avg",
              where: [{ field: "responseTime", op: ">=", value: "0" }],
            },
            valueMode: "periodTotal",
            format: "number",
            invert: true,
            icon: "Timer",
          },
          {
            id: "sla_breach_rate",
            title: t("sla_breach_rate_60m"),
            metric: "slaBreachRate",
            model: "supportTicket",
            // Breaches over tickets that actually got a first reply — not over
            // everything created, which would flatter the desk on a quiet week.
            derived: { op: "percent", of: ["slaBreaches", "answered"] },
            format: "percent",
            invert: true,
            icon: "Percent",
          },
        ],
      },
      {
        type: "chart" as const,
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 1, span: 2 },
          desktop: { cols: 1, span: 1 },
        },
        items: [
          {
            id: "busiestAgents",
            title: t("busiest_agents"),
            // Who is carrying the desk this period. `agentName` is denormalised
            // onto the ticket, so it is grouped directly rather than through
            // the `agentId` association.
            description: t("tickets_handled_per_agent_unclaimed_tickets"),
            type: "bar" as const,
            model: "supportTicket",
            metrics: [],
            config: {
              groupBy: "agentName",
              limit: 6,
            },
          },
        ],
      },
    ],

    // ─────────────────────────────────────────────────────────────
    // Row 2 — throughput. If "Created" runs above "Answered" for more
    // than a bucket or two the backlog is compounding and nothing else
    // on this page matters.
    // ─────────────────────────────────────────────────────────────
    {
      type: "chart" as const,
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 1, span: 1 },
        desktop: { cols: 1, span: 1 },
      },
      items: [
        {
          id: "ticketFlowOverTime",
          title: t("tickets_over_time"),
          description: t("created_answered_and_past_the_60_minute_sla"),
          type: "line" as const,
          model: "supportTicket",
          metrics: ["total", "answered", "slaBreaches"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: {
            total: "Created",
            answered: "Answered",
            slaBreaches: "Past SLA",
          },
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────
    // Row 3 — the two numbers behind the breach rate, the CSAT the desk
    // is scored on, and WHICH agent the latency is coming from. A single
    // "average first response" hides one slow queue inside a healthy
    // mean; ranked by agent it is a staffing decision.
    // ─────────────────────────────────────────────────────────────
    [
      {
        type: "kpi" as const,
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 2, span: 2 },
          desktop: { cols: 3, span: 2 },
        },
        items: [
          {
            id: "tickets_answered",
            title: t("answered_first_reply"),
            metric: "answered",
            model: "supportTicket",
            aggregation: { field: "responseTime", op: "count" },
            valueMode: "periodTotal",
            format: "number",
            icon: "MessageCircle",
          },
          {
            id: "sla_breaches",
            title: t("past_60_minute_sla"),
            metric: "slaBreaches",
            model: "supportTicket",
            aggregation: {
              op: "count",
              field: "id",
              where: [{ field: "responseTime", op: ">", value: "60" }],
            },
            valueMode: "periodTotal",
            format: "number",
            invert: true,
            icon: "TimerOff",
          },
          {
            id: "avg_satisfaction",
            title: t("avg_satisfaction_1_5"),
            metric: "avgCsat",
            model: "supportTicket",
            aggregation: { field: "satisfaction", op: "avg" },
            valueMode: "periodTotal",
            format: "number",
            icon: "Star",
          },
        ],
      },
      {
        type: "chart" as const,
        responsive: {
          mobile: { cols: 1, span: 1 },
          tablet: { cols: 1, span: 2 },
          desktop: { cols: 1, span: 1 },
        },
        items: [
          {
            id: "slowestAgentsByResponse",
            title: tCommon("response_time"),
            // Ranked DESC, so the top row is the SLOWEST queue — the one to
            // act on. The same `>= 0` guard as the headline average: an agent
            // who answers within the minute must count, not be filtered out of
            // their own scorecard.
            description:
              t("average_minutes_to_first_reply_by"),
            type: "bar" as const,
            model: "supportTicket",
            metrics: [],
            config: {
              groupBy: "agentName",
              limit: 6,
              measure: {
                field: "responseTime",
                op: "avg" as const,
                where: [{ field: "responseTime", op: ">=" as const, value: "0" }],
              },
            },
          },
        ],
      },
    ],
  ] as AnalyticsConfig;
}
