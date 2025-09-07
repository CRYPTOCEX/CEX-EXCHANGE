import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op, fn, col, literal } from "sequelize";

export const metadata = {
  summary: "Get Trade History with Pagination",
  description: "Retrieves paginated trade history for the authenticated user with filtering options.",
  operationId: "getP2PTradeHistory",
  tags: ["P2P", "Trade"],
  requiresAuth: true,
  middleware: ["p2pSearchRateLimit"],
  parameters: [
    {
      name: "page",
      in: "query",
      description: "Page number (1-based)",
      required: false,
      schema: { type: "integer", minimum: 1, default: 1 },
    },
    {
      name: "limit",
      in: "query",
      description: "Number of items per page",
      required: false,
      schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    },
    {
      name: "status",
      in: "query",
      description: "Filter by trade status",
      required: false,
      schema: {
        type: "string",
        enum: ["PENDING", "PAYMENT_SENT", "ESCROW_RELEASED", "COMPLETED", "DISPUTED", "CANCELLED", "EXPIRED"],
      },
    },
    {
      name: "type",
      in: "query", 
      description: "Filter by trade type",
      required: false,
      schema: { type: "string", enum: ["BUY", "SELL"] },
    },
    {
      name: "currency",
      in: "query",
      description: "Filter by cryptocurrency",
      required: false,
      schema: { type: "string" },
    },
    {
      name: "dateFrom",
      in: "query",
      description: "Filter trades from this date",
      required: false,
      schema: { type: "string", format: "date" },
    },
    {
      name: "dateTo",
      in: "query",
      description: "Filter trades until this date",
      required: false,
      schema: { type: "string", format: "date" },
    },
    {
      name: "search",
      in: "query",
      description: "Search by trade ID or counterparty name",
      required: false,
      schema: { type: "string" },
    },
    {
      name: "sortBy",
      in: "query",
      description: "Sort field",
      required: false,
      schema: { 
        type: "string", 
        enum: ["createdAt", "updatedAt", "amount", "totalAmount", "status"],
        default: "createdAt"
      },
    },
    {
      name: "sortOrder",
      in: "query",
      description: "Sort order",
      required: false,
      schema: { type: "string", enum: ["ASC", "DESC"], default: "DESC" },
    },
  ],
  responses: {
    200: { 
      description: "Trade history retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              trades: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    type: { type: "string", enum: ["BUY", "SELL"] },
                    currency: { type: "string" },
                    amount: { type: "number" },
                    price: { type: "number" },
                    totalAmount: { type: "number" },
                    status: { type: "string" },
                    counterparty: { type: "object" },
                    paymentMethod: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                  },
                },
              },
              pagination: {
                type: "object",
                properties: {
                  page: { type: "integer" },
                  limit: { type: "integer" },
                  total: { type: "integer" },
                  totalPages: { type: "integer" },
                  hasNext: { type: "boolean" },
                  hasPrev: { type: "boolean" },
                },
              },
              summary: {
                type: "object",
                properties: {
                  totalVolume: { type: "number" },
                  completedCount: { type: "integer" },
                  successRate: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { query?: any; user?: any }) => {
  const { query = {}, user } = data;
  
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    // Parse query parameters
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {
      [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
    };

    // Add filters
    if (query.status) {
      where.status = query.status;
    }

    if (query.currency) {
      where.currency = query.currency.toUpperCase();
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        where.createdAt[Op.gte] = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.createdAt[Op.lte] = new Date(query.dateTo);
      }
    }

    // Handle type filter (BUY/SELL from user perspective)
    let typeFilter: any = null;
    if (query.type) {
      if (query.type === "BUY") {
        typeFilter = { buyerId: user.id };
      } else if (query.type === "SELL") {
        typeFilter = { sellerId: user.id };
      }
    }

    if (typeFilter) {
      where[Op.and] = [typeFilter];
    }

    // Search functionality
    if (query.search) {
      const searchConditions = [
        { id: { [Op.iLike]: `%${query.search}%` } },
      ];
      
      // Search in user names (would need to join user table)
      // For now, just search by ID
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({ [Op.or]: searchConditions });
    }

    // Execute queries
    const [trades, total] = await Promise.all([
      models.p2pTrade.findAll({
        where,
        include: [
          {
            model: models.user,
            as: "buyer",
            attributes: ["id", "firstName", "lastName", "avatar"],
          },
          {
            model: models.user,
            as: "seller",
            attributes: ["id", "firstName", "lastName", "avatar"],
          },
          {
            model: models.p2pOffer,
            as: "offer",
            attributes: ["id", "currency", "type"],
          },
          {
            model: models.p2pPaymentMethod,
            as: "paymentMethod",
            attributes: ["id", "name", "icon"],
          },
        ],
        order: [[query.sortBy || "createdAt", query.sortOrder || "DESC"]],
        limit,
        offset,
      }),
      models.p2pTrade.count({ where }),
    ]);

    // Calculate summary statistics
    const summaryData = await models.p2pTrade.findAll({
      where,
      attributes: [
        [fn("SUM", col("totalAmount")), "totalVolume"],
        [fn("COUNT", literal("CASE WHEN status = 'COMPLETED' THEN 1 END")), "completedCount"],
        [fn("COUNT", col("id")), "totalCount"],
      ],
      raw: true,
    });

    const summary = summaryData[0] || {};
    const successRate = summary.totalCount > 0 
      ? Math.round((summary.completedCount / summary.totalCount) * 100) 
      : 0;

    // Format trades for response
    const formattedTrades = trades.map((trade) => {
      const isBuyer = trade.buyerId === user.id;
      const counterparty = isBuyer ? trade.seller : trade.buyer;
      
      return {
        id: trade.id,
        type: isBuyer ? "BUY" : "SELL",
        currency: trade.offer?.currency || trade.currency,
        amount: trade.amount,
        price: trade.price,
        totalAmount: trade.totalAmount,
        status: trade.status,
        counterparty: counterparty ? {
          id: counterparty.id,
          name: `${counterparty.firstName} ${counterparty.lastName}`.trim() || "Anonymous",
          avatar: counterparty.avatar,
        } : null,
        paymentMethod: trade.paymentMethod ? {
          id: trade.paymentMethod.id,
          name: trade.paymentMethod.name,
          icon: trade.paymentMethod.icon,
        } : null,
        createdAt: trade.createdAt,
        updatedAt: trade.updatedAt,
        completedAt: trade.completedAt,
        expiresAt: trade.expiresAt,
      };
    });

    // Build pagination info
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return {
      trades: formattedTrades,
      pagination,
      summary: {
        totalVolume: parseFloat(summary.totalVolume || 0),
        completedCount: parseInt(summary.completedCount || 0),
        successRate,
      },
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: "Failed to fetch trade history: " + error.message,
    });
  }
};