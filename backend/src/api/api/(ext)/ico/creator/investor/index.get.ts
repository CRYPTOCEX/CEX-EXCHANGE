import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, col, literal, Op } from "sequelize";

export const metadata = {
  summary: "Get Investors for Creator Offerings",
  description:
    "Retrieves aggregated investor details (including total amount invested, total tokens purchased, latest transaction date, rejected investment amount, and token info from the ICO offering) for ICO offerings created by the authenticated creator. Supports pagination, sorting, and searching. (Aggregation is done by computing valid transactions (PENDING/RELEASED) and rejected transactions separately.)",
  operationId: "getCreatorInvestors",
  tags: ["ICO", "Creator", "Investors"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "page",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Page number",
    },
    {
      index: 1,
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Number of items per page",
    },
    {
      index: 2,
      name: "sortField",
      in: "query",
      required: false,
      schema: { type: "string" },
      description:
        "Field to sort by. For associated fields use dot notation (e.g. 'user.firstName'). Defaults to 'lastTransactionDate'.",
    },
    {
      index: 3,
      name: "sortDirection",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Sort direction: asc or desc (default: desc)",
    },
    {
      index: 4,
      name: "search",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Search query to filter by investor first or last name",
    },
  ],
  responses: {
    200: {
      description: "Investors retrieved successfully.",
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
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Get all offerings for which the creator is the owner.
  const offerings = await models.icoTokenOffering.findAll({
    attributes: ["id"],
    where: { userId: user.id },
    raw: true,
  });
  const offeringIds = offerings.map((o) => o.id);
  if (offeringIds.length === 0) {
    return {
      items: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
      },
    };
  }

  // Build the base where clause.
  // Note: Instead of filtering out rejected transactions, we include all transactions
  // and later differentiate them using CASE statements.
  const where: any = {
    offeringId: { [Op.in]: offeringIds },
  };

  // Apply search on joined user fields if provided.
  if (query.search) {
    const search = query.search.toLowerCase();
    where[Op.and] = [
      {
        [Op.or]: [
          { "$user.firstName$": { [Op.like]: `%${search}%` } },
          { "$user.lastName$": { [Op.like]: `%${search}%` } },
        ],
      },
    ];
  }

  // Parse pagination parameters.
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  // Parse sort parameters.
  const rawSortField = query.sortField || "lastTransactionDate";
  const sortDirection =
    query.sortDirection && query.sortDirection.toUpperCase() === "ASC"
      ? "ASC"
      : "DESC";

  let orderCriteria;
  if (rawSortField.includes(".")) {
    const parts = rawSortField.split(".");
    if (parts[0] === "user") {
      orderCriteria = [
        [{ model: models.user, as: "user" }, parts[1], sortDirection],
      ];
    } else if (parts[0] === "offering") {
      orderCriteria = [
        [
          { model: models.icoTokenOffering, as: "offering" },
          parts[1],
          sortDirection,
        ],
      ];
    } else {
      orderCriteria = [[rawSortField, sortDirection]];
    }
  } else {
    orderCriteria = [[rawSortField, sortDirection]];
  }

  // Run the aggregation query with CASE expressions to compute both valid and rejected amounts.
  const aggregated = await models.icoTransaction.findAll({
    attributes: [
      "userId",
      "offeringId",
      // Sum valid investments (PENDING and RELEASED)
      [
        fn(
          "SUM",
          literal(
            "CASE WHEN icoTransaction.status IN ('PENDING', 'RELEASED') THEN icoTransaction.amount * icoTransaction.price ELSE 0 END"
          )
        ),
        "totalCost",
      ],
      // Sum rejected investments
      [
        fn(
          "SUM",
          literal(
            "CASE WHEN icoTransaction.status = 'REJECTED' THEN icoTransaction.amount * icoTransaction.price ELSE 0 END"
          )
        ),
        "rejectedCost",
      ],
      // Sum tokens for valid transactions
      [
        fn(
          "SUM",
          literal(
            "CASE WHEN icoTransaction.status IN ('PENDING', 'RELEASED') THEN icoTransaction.amount ELSE 0 END"
          )
        ),
        "totalTokens",
      ],
      [fn("MAX", col("icoTransaction.createdAt")), "lastTransactionDate"],
    ],
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["firstName", "lastName", "avatar"],
      },
      {
        model: models.icoTokenOffering,
        as: "offering",
        attributes: ["name", "symbol", "icon"],
      },
    ],
    where,
    group: ["userId", "offeringId", "user.id", "offering.id"],
    order: orderCriteria,
    raw: false,
  });

  // Apply pagination in memory.
  const totalItems = aggregated.length;
  const totalPages = Math.ceil(totalItems / limit);
  const items = aggregated.slice(offset, offset + limit);

  return {
    items,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
    },
  };
};
