"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Trade History with Pagination",
    description: "Retrieves paginated trade history for the authenticated user with filtering options.",
    operationId: "getP2PTradeHistory",
    tags: ["P2P", "Trade"],
    logModule: "P2P",
    logTitle: "Get trade history",
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
exports.default = async (data) => {
    const { query = {}, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing query parameters and building filters");
    try {
        const page = Math.max(1, parseInt(query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
        const offset = (page - 1) * limit;
        const where = {
            [sequelize_1.Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
        };
        if (query.status) {
            where.status = query.status;
        }
        if (query.currency) {
            where.currency = query.currency.toUpperCase();
        }
        if (query.dateFrom || query.dateTo) {
            where.createdAt = {};
            if (query.dateFrom) {
                where.createdAt[sequelize_1.Op.gte] = new Date(query.dateFrom);
            }
            if (query.dateTo) {
                where.createdAt[sequelize_1.Op.lte] = new Date(query.dateTo);
            }
        }
        let typeFilter = null;
        if (query.type) {
            if (query.type === "BUY") {
                typeFilter = { buyerId: user.id };
            }
            else if (query.type === "SELL") {
                typeFilter = { sellerId: user.id };
            }
        }
        if (typeFilter) {
            where[sequelize_1.Op.and] = [typeFilter];
        }
        if (query.search) {
            const searchConditions = [
                { id: { [sequelize_1.Op.iLike]: `%${query.search}%` } },
            ];
            where[sequelize_1.Op.and] = where[sequelize_1.Op.and] || [];
            where[sequelize_1.Op.and].push({ [sequelize_1.Op.or]: searchConditions });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching trade history (page ${page}, limit ${limit})`);
        const [trades, total] = await Promise.all([
            db_1.models.p2pTrade.findAll({
                where,
                include: [
                    {
                        model: db_1.models.user,
                        as: "buyer",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                    {
                        model: db_1.models.user,
                        as: "seller",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                    {
                        model: db_1.models.p2pOffer,
                        as: "offer",
                        attributes: ["id", "currency", "type"],
                    },
                    {
                        model: db_1.models.p2pPaymentMethod,
                        as: "paymentMethod",
                        attributes: ["id", "name", "icon"],
                    },
                ],
                order: [[query.sortBy || "createdAt", query.sortOrder || "DESC"]],
                limit,
                offset,
            }),
            db_1.models.p2pTrade.count({ where }),
        ]);
        const summaryData = await db_1.models.p2pTrade.findAll({
            where,
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("totalAmount")), "totalVolume"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("CASE WHEN status = 'COMPLETED' THEN 1 END")), "completedCount"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalCount"],
            ],
            raw: true,
        });
        const summaryRaw = (summaryData[0] || {});
        const summaryTotalCount = summaryRaw.totalCount || 0;
        const summaryCompletedCount = summaryRaw.completedCount || 0;
        const summaryTotalVolume = summaryRaw.totalVolume || 0;
        const successRate = summaryTotalCount > 0
            ? Math.round((summaryCompletedCount / summaryTotalCount) * 100)
            : 0;
        const formattedTrades = trades.map((trade) => {
            var _a;
            const isBuyer = trade.buyerId === user.id;
            const counterparty = isBuyer ? trade.seller : trade.buyer;
            return {
                id: trade.id,
                type: isBuyer ? "BUY" : "SELL",
                currency: ((_a = trade.offer) === null || _a === void 0 ? void 0 : _a.currency) || trade.currency,
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
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${formattedTrades.length} trades (page ${page}/${Math.ceil(total / limit)})`);
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
                totalVolume: parseFloat(String(summaryTotalVolume)) || 0,
                completedCount: parseInt(String(summaryCompletedCount)) || 0,
                successRate,
            },
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to fetch trade history");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch trade history: " + error.message,
        });
    }
};
