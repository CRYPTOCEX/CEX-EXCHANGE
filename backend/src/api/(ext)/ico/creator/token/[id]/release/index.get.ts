// backend/src/api/(ext)/ico/token/release/index.get.ts
import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Fetch Token Release Transactions",
  description:
    "Retrieves token release transactions for a given token (offering) ID, optionally filtered by status and paginated with sorting support.",
  operationId: "getTokenReleaseTransactions",
  tags: ["ICO", "Token", "Release"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "param",
      required: true,
      schema: { type: "string" },
      description: "Token (offering) ID",
    },
    {
      index: 1,
      name: "status",
      in: "query",
      required: false,
      schema: { type: "string" },
      description:
        "Filter transactions by status (PENDING, VERIFICATION, RELEASED)",
    },
    {
      index: 2,
      name: "page",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Page number",
    },
    {
      index: 3,
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Number of items per page",
    },
    {
      index: 4,
      name: "sortField",
      in: "query",
      required: false,
      schema: { type: "string" },
      description:
        "Field to sort by (default is createdAt). For associated models use dot notation (e.g., 'user.firstName')",
    },
    {
      index: 5,
      name: "sortDirection",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Sort direction: asc or desc (default is desc)",
    },
  ],
  responses: {
    200: {
      description: "Token release transactions retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { type: "object" },
              },
              pagination: {
                type: "object",
                properties: {
                  currentPage: { type: "number" },
                  totalPages: { type: "number" },
                  totalItems: { type: "number" },
                  itemsPerPage: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, query, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  if (!id) {
    throw createError({ statusCode: 400, message: "id is required" });
  }

  // Build filtering criteria
  const where: any = { offeringId: id };
  if (query.status) {
    where.status = query.status.toUpperCase();
  }

  // Parse pagination parameters
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  // Parse sort parameters
  const rawSortField = query.sortField || "createdAt";
  const sortDirection =
    query.sortDirection && query.sortDirection.toUpperCase() === "ASC"
      ? "ASC"
      : "DESC";

  let orderCriteria;
  // If sortField contains a dot, assume association sort
  if (rawSortField.includes(".")) {
    const parts = rawSortField.split(".");
    // For now, only support sorting by the "user" association.
    if (parts[0] === "user") {
      orderCriteria = [
        [{ model: models.user, as: "user" }, parts[1], sortDirection],
      ];
    } else {
      orderCriteria = [[rawSortField, sortDirection]];
    }
  } else {
    orderCriteria = [[rawSortField, sortDirection]];
  }

  // Count total records
  const totalItems = await models.icoTransaction.count({ where });

  // Fetch transactions with pagination, sorting, and including investor info.
  const transactions = await models.icoTransaction.findAll({
    where,
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["firstName", "lastName", "avatar"],
      },
    ],
    offset,
    limit,
    order: orderCriteria,
  });

  const totalPages = Math.ceil(totalItems / limit);

  return {
    items: transactions,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
    },
  };
};
