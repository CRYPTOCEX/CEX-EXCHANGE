"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
exports.metadata = {
    summary: "Add a market for leader to trade",
    description: "Declares a new market that the leader will trade on. Followers will need to provide liquidity for this market.",
    operationId: "addLeaderMarket",
    tags: ["Copy Trading", "Leader"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Add leader market",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        symbol: {
                            type: "string",
                            description: "Market symbol (e.g., BTC/USDT)",
                        },
                        minBase: {
                            type: "number",
                            description: "Minimum base currency allocation amount",
                        },
                        minQuote: {
                            type: "number",
                            description: "Minimum quote currency allocation amount",
                        },
                    },
                    required: ["symbol"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Market added successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            symbol: { type: "string" },
                            baseCurrency: { type: "string" },
                            quoteCurrency: { type: "string" },
                            minBase: { type: "number" },
                            minQuote: { type: "number" },
                            isActive: { type: "boolean" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        404: { description: "Leader or Market not found" },
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { symbol, minBase, minQuote } = body;
    if (!symbol || typeof symbol !== "string") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Symbol is required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding leader profile");
    const leader = await db_1.models.copyTradingLeader.findOne({
        where: { userId: user.id, status: "ACTIVE" },
    });
    if (!leader) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Active leader profile not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing symbol");
    const parts = symbol.split("/");
    if (parts.length !== 2) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid symbol format. Use BASE/QUOTE (e.g., BTC/USDT)",
        });
    }
    const [baseCurrency, quoteCurrency] = parts;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating market exists");
    const market = await db_1.models.ecosystemMarket.findOne({
        where: { currency: baseCurrency, pair: quoteCurrency, status: true },
    });
    if (!market) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Market ${symbol} not found or inactive`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking existing market");
    const existing = await db_1.models.copyTradingLeaderMarket.findOne({
        where: { leaderId: leader.id, symbol },
    });
    if (existing) {
        if (existing.isActive) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Market already added" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Reactivating market");
        await existing.update({
            isActive: true,
            minBase: minBase !== null && minBase !== void 0 ? minBase : existing.minBase,
            minQuote: minQuote !== null && minQuote !== void 0 ? minQuote : existing.minQuote,
        });
        await (0, utils_1.createAuditLog)({
            entityType: "LEADER",
            entityId: leader.id,
            action: "UPDATE",
            oldValue: { symbol, isActive: false },
            newValue: { symbol, isActive: true, minBase, minQuote },
            userId: user.id,
            reason: "Market reactivated",
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Market reactivated");
        return existing;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating market");
    const leaderMarket = await db_1.models.copyTradingLeaderMarket.create({
        leaderId: leader.id,
        symbol,
        baseCurrency,
        quoteCurrency,
        minBase: minBase || 0,
        minQuote: minQuote || 0,
        isActive: true,
    });
    await (0, utils_1.createAuditLog)({
        entityType: "LEADER",
        entityId: leader.id,
        action: "UPDATE",
        newValue: { symbol, baseCurrency, quoteCurrency },
        userId: user.id,
        reason: "Market added",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Market added");
    return leaderMarket;
};
