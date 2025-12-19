// backend/src/api/admin/p2p/disputes/index.get.ts

import { models } from "@b/db";
import { getFiltered } from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "List all P2P disputes",
  operationId: "listAdminP2PDisputes",
  tags: ["Admin", "P2P", "Dispute"],
  description: "Retrieves a paginated list of all P2P disputes with detailed information including trade details, involved users, and dispute status. Supports filtering, sorting, and pagination.",
  parameters: crudParameters,
  responses: {
    200: {
      description: "Paginated list of P2P disputes retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                description: "Array of P2P dispute objects",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid", description: "Dispute ID" },
                    tradeId: { type: "string", format: "uuid", description: "Associated trade ID" },
                    amount: { type: "string", description: "Disputed amount" },
                    reportedById: { type: "string", format: "uuid", description: "User who reported the dispute" },
                    againstId: { type: "string", format: "uuid", description: "User against whom dispute was filed" },
                    reason: { type: "string", description: "Reason for dispute" },
                    details: { type: "string", nullable: true, description: "Additional dispute details" },
                    filedOn: { type: "string", format: "date-time", description: "When dispute was filed" },
                    status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "RESOLVED"], description: "Dispute status" },
                    priority: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"], description: "Dispute priority" },
                    resolution: { type: "object", nullable: true, description: "Resolution details if resolved" },
                    resolvedOn: { type: "string", format: "date-time", nullable: true, description: "When dispute was resolved" },
                    messages: { type: "array", description: "Dispute messages" },
                    evidence: { type: "array", description: "Submitted evidence" },
                    activityLog: { type: "array", description: "Activity log entries" },
                    trade: {
                      type: "object",
                      description: "Associated trade details",
                      properties: {
                        id: { type: "string" },
                        status: { type: "string" },
                        amount: { type: "number" },
                        currency: { type: "string" },
                      },
                    },
                    reportedBy: {
                      type: "object",
                      description: "User who reported",
                      properties: {
                        id: { type: "string" },
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                        email: { type: "string" },
                        avatar: { type: "string", nullable: true },
                      },
                    },
                    against: {
                      type: "object",
                      description: "User against whom dispute was filed",
                      properties: {
                        id: { type: "string" },
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                        email: { type: "string" },
                        avatar: { type: "string", nullable: true },
                      },
                    },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                  },
                },
              },
              pagination: paginationSchema,
            },
            required: ["items", "pagination"],
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("P2P Disputes"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  logModule: "ADMIN_P2P",
  logTitle: "Get P2P Disputes",
  permission: "view.p2p.dispute",
  demoMask: ["items.reportedBy.email", "items.against.email"],
};

export default async (data: Handler) => {
  const { query, user, ctx } = data;

  ctx?.step("Fetching data");
    if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // You might adjust filtering logic as needed.
    ctx?.success("Operation completed successfully");
  return getFiltered({
    model: models.p2pDispute,
    query,
    sortField: query.sortField || "filedOn",
    where: {},
    includeModels: [
      {
        model: models.p2pTrade,
        as: "trade",
        attributes: ["id", "status", "amount", "currency"],
      },
      {
        model: models.user,
        as: "reportedBy",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
        required: false,
      },
      {
        model: models.user,
        as: "against",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
        required: false,
      },
    ],
  });
};
