// Admin get copy trading audit logs
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, col, Op } from "sequelize";
import {
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Get Copy Trading Audit Logs",
  description:
    "Retrieves audit logs for copy trading with filtering and pagination. Supports filtering by entity type, entity ID, action, user ID, admin ID, and date range. Returns audit logs with associated user and admin information, plus action type counts for filtering.",
  operationId: "getAdminCopyTradingAuditLogs",
  tags: ["Admin", "Copy Trading", "Audit"],
  requiresAuth: true,
  logModule: "ADMIN_COPY",
  logTitle: "Get Copy Trading Audit",
  permission: "access.copy_trading",
  demoMask: ["items.user.email", "items.admin.email"],
  parameters: [
    {
      name: "entityType",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["LEADER", "FOLLOWER", "TRADE", "TRANSACTION", "SETTING"] },
      description: "Filter by entity type",
    },
    {
      name: "entityId",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter by entity ID",
    },
    {
      name: "action",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter by action type",
    },
    {
      name: "userId",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter by affected user ID",
    },
    {
      name: "adminId",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter by admin who performed action",
    },
    {
      name: "dateFrom",
      in: "query",
      required: false,
      schema: { type: "string", format: "date" },
      description: "Filter from date",
    },
    {
      name: "dateTo",
      in: "query",
      required: false,
      schema: { type: "string", format: "date" },
      description: "Filter until date",
    },
    {
      name: "page",
      in: "query",
      required: false,
      schema: { type: "integer", default: 1 },
    },
    {
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "integer", default: 20 },
    },
  ],
  responses: {
    200: {
      description: "Audit logs retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                description: "List of audit logs",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    entityType: { type: "string" },
                    entityId: { type: "string" },
                    action: { type: "string" },
                    oldValue: { type: "object" },
                    newValue: { type: "object" },
                    metadata: { type: "object" },
                    userId: { type: "string" },
                    adminId: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    user: { type: "object" },
                    admin: { type: "object" },
                  },
                },
              },
              pagination: {
                type: "object",
                properties: {
                  total: { type: "integer" },
                  page: { type: "integer" },
                  limit: { type: "integer" },
                  totalPages: { type: "integer" },
                },
              },
              filters: {
                type: "object",
                properties: {
                  actions: {
                    type: "array",
                    description: "Available action types with counts",
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    403: forbiddenResponse,
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, query, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Build where clause
  const where: any = {};

  if (query.entityType) {
    where.entityType = query.entityType;
  }

  if (query.entityId) {
    where.entityId = query.entityId;
  }

  if (query.action) {
    where.action = query.action;
  }

  if (query.userId) {
    where.userId = query.userId;
  }

  if (query.adminId) {
    where.adminId = query.adminId;
  }

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) {
      where.createdAt[Op.gte] = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      where.createdAt[Op.lte] = new Date(query.dateTo + "T23:59:59.999Z");
    }
  }

  // Pagination
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  const { count, rows: logs } = await models.copyTradingAuditLog.findAndCountAll({
    where,
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email"],
        required: false,
      },
      {
        model: models.user,
        as: "admin",
        attributes: ["id", "firstName", "lastName", "email"],
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  // Get action type counts for filters
  ctx?.step("Fetching audit logs");

  const actionCounts = await models.copyTradingAuditLog.findAll({
    attributes: [
      "action",
      [fn("COUNT", col("id")), "count"],
    ],
    group: ["action"],
  });

  ctx?.success("Audit logs retrieved successfully");

  return {
    items: logs.map((log: any) => {
      const item = log.toJSON();
      // Parse JSON fields
      try {
        if (item.oldValue) item.oldValue = JSON.parse(item.oldValue);
        if (item.newValue) item.newValue = JSON.parse(item.newValue);
        if (item.metadata) item.metadata = JSON.parse(item.metadata);
      } catch {}
      return item;
    }),
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
    filters: {
      actions: actionCounts.map((a: any) => ({
        action: a.action,
        count: parseInt(a.get("count")),
      })),
    },
  };
};
