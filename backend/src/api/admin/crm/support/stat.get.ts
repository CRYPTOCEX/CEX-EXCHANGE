import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { col, fn, Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Support Ticket Dashboard Analytics",
  description:
    "Returns admin analytics for support tickets (counts, averages, etc).",
  operationId: "adminSupportTicketStats",
  tags: ["Admin", "CRM", "Support Ticket"],
  requiresAuth: true,
  permission: "access.support.ticket",
  responses: {
    200: {
      description: "Support ticket analytics",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              total: { type: "number" },
              open: { type: "number" },
              pending: { type: "number" },
              closed: { type: "number" },
              unassigned: { type: "number" },
              avgResponseTime: { type: "number" },
              satisfaction: { type: "number" },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Server error" },
  },
};

export default async (data: Handler) => {
  // All in one call for speed:
  const [
    total,
    open,
    pending,
    closed,
    unassigned,
    avgResponse,
    avgSatisfaction,
  ] = await Promise.all([
    models.supportTicket.count(),
    models.supportTicket.count({ where: { status: "OPEN" } }),
    models.supportTicket.count({ where: { status: "PENDING" } }),
    models.supportTicket.count({ where: { status: "CLOSED" } }),
    models.supportTicket.count({ where: { agentId: null } }),
    // Average responseTime (skip nulls and zeros)
    models.supportTicket.findOne({
      attributes: [[fn("AVG", col("responseTime")), "avgResponseTime"]],
      where: { responseTime: { [Op.gt]: 0 } },
      raw: true,
    }),
    // Average satisfaction
    models.supportTicket.findOne({
      attributes: [[fn("AVG", col("satisfaction")), "avgSatisfaction"]],
      where: { satisfaction: { [Op.not]: null } },
      raw: true,
    }),
  ]);

  return {
    total,
    open,
    pending,
    closed,
    unassigned,
    avgResponseTime: avgResponse?.avgResponseTime
      ? Math.round(Number(avgResponse.avgResponseTime))
      : 0,
    satisfaction: avgSatisfaction?.avgSatisfaction
      ? Number(avgSatisfaction.avgSatisfaction).toFixed(2)
      : 0,
  };
};
