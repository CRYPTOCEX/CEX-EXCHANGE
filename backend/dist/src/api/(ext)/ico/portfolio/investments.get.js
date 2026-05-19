"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "List User ICO Investments",
    description: "Returns the authenticated user's ICO investment history as an array of per-transaction rows. Each row includes the related token offering name/symbol, purchase price, computed total invested, current value (based on the offering's currentPrice or tokenPrice fallback), and profit/loss metrics. Supports optional filtering by transaction status and a row limit.",
    operationId: "listUserIcoInvestments",
    tags: ["ICO", "Portfolio"],
    logModule: "ICO",
    logTitle: "Get ICO Investments",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "status",
            in: "query",
            required: false,
            schema: {
                type: "string",
                description: "Filter by transaction status (PENDING, VERIFICATION, RELEASED, REJECTED, REFUNDED).",
            },
        },
        {
            index: 1,
            name: "limit",
            in: "query",
            required: false,
            schema: {
                type: "integer",
                description: "Maximum number of investments to return (default 50).",
            },
        },
    ],
    responses: {
        200: {
            description: "User ICO investments retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        offerId: { type: "string" },
                                        offerName: { type: "string" },
                                        tokenSymbol: { type: "string" },
                                        amount: { type: "number" },
                                        price: { type: "number" },
                                        totalInvested: { type: "number" },
                                        currentValue: { type: "number" },
                                        profitLoss: { type: "number" },
                                        profitLossPercentage: { type: "number" },
                                        status: { type: "string" },
                                        createdAt: { type: "string", format: "date-time" },
                                    },
                                },
                            },
                            total: { type: "number" },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized." },
        500: { description: "Internal Server Error." },
    },
};
const ALLOWED_STATUSES = new Set([
    "PENDING",
    "VERIFICATION",
    "RELEASED",
    "REJECTED",
    "REFUNDED",
]);
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching ICO investments");
    try {
        const where = { userId: user.id };
        if (query === null || query === void 0 ? void 0 : query.status) {
            const statusUpper = String(query.status).toUpperCase();
            if (ALLOWED_STATUSES.has(statusUpper)) {
                where.status = statusUpper;
            }
        }
        let limit = 50;
        if ((query === null || query === void 0 ? void 0 : query.limit) !== undefined) {
            const parsed = parseInt(String(query.limit), 10);
            if (!Number.isNaN(parsed) && parsed > 0) {
                limit = Math.min(parsed, 500);
            }
        }
        const transactions = await db_1.models.icoTransaction.findAll({
            where,
            include: [
                {
                    model: db_1.models.icoTokenOffering,
                    as: "offering",
                    attributes: [
                        "id",
                        "name",
                        "symbol",
                        "icon",
                        "tokenPrice",
                        "currentPrice",
                    ],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit,
        });
        const items = transactions.map((tx) => {
            var _a, _b, _c;
            const amount = Number(tx.amount) || 0;
            const price = Number(tx.price) || 0;
            const totalInvested = amount * price;
            const offering = tx.offering;
            const currentPriceRaw = (offering === null || offering === void 0 ? void 0 : offering.currentPrice) != null
                ? Number(offering.currentPrice)
                : (offering === null || offering === void 0 ? void 0 : offering.tokenPrice) != null
                    ? Number(offering.tokenPrice)
                    : null;
            let currentValue = totalInvested;
            let profitLoss = 0;
            let profitLossPercentage = 0;
            if (tx.status === "RELEASED" && currentPriceRaw != null) {
                currentValue = amount * currentPriceRaw;
                profitLoss = currentValue - totalInvested;
                profitLossPercentage =
                    totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
            }
            return {
                id: tx.id,
                offerId: tx.offeringId,
                offerName: (_a = offering === null || offering === void 0 ? void 0 : offering.name) !== null && _a !== void 0 ? _a : "",
                tokenSymbol: (_b = offering === null || offering === void 0 ? void 0 : offering.symbol) !== null && _b !== void 0 ? _b : "",
                offerIcon: (_c = offering === null || offering === void 0 ? void 0 : offering.icon) !== null && _c !== void 0 ? _c : "",
                amount,
                price,
                totalInvested,
                currentValue,
                profitLoss,
                profitLossPercentage,
                status: tx.status,
                createdAt: tx.createdAt,
            };
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("ICO investments retrieved successfully");
        return { items, total: items.length };
    }
    catch (err) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};
