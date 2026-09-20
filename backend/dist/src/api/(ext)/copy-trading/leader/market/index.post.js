"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const core_1 = require("@b/api/(ext)/copy-trading/utils/core");
const native_binary_1 = require("../../utils/native-binary");
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
                        marketType: {
                            type: "string",
                            enum: ["SPOT", "BINARY"],
                            default: "SPOT",
                            description: "Instrument class of the market",
                        },
                        minBase: {
                            type: "number",
                            description: "Minimum base currency allocation amount (SPOT only)",
                        },
                        minQuote: {
                            type: "number",
                            description: "Minimum quote currency allocation amount; for BINARY this is the minimum stake budget",
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
    (0, native_binary_1.assertNotBinaryOnNativeApp)(data, body === null || body === void 0 ? void 0 : body.marketType, "add a binary market");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { symbol, minBase, minQuote } = body;
    const marketType = body.marketType === "BINARY" ? "BINARY" : "SPOT";
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
    if (!(0, core_1.leaderOffersMarketType)(leader.tradingType, marketType)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Your leader profile does not offer ${marketType} copy trading`,
        });
    }
    const availability = await (0, core_1.checkCopyTypeAvailability)(marketType);
    if (!availability.available) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: availability.reason || `${marketType} copy trading is not available`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating market exists");
    const { baseCurrency, quoteCurrency } = await (0, core_1.validateCopyMarketSymbol)(symbol, marketType);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking existing market");
    const existing = await db_1.models.copyTradingLeaderMarket.findOne({
        where: { leaderId: leader.id, symbol, marketType },
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
        await (0, core_1.createAuditLog)({
            entityType: "LEADER",
            entityId: leader.id,
            action: "UPDATE",
            oldValue: { symbol, marketType, isActive: false },
            newValue: { symbol, marketType, isActive: true, minBase, minQuote },
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
        marketType,
        baseCurrency,
        quoteCurrency,
        minBase: minBase || 0,
        minQuote: minQuote || 0,
        isActive: true,
    });
    await (0, core_1.createAuditLog)({
        entityType: "LEADER",
        entityId: leader.id,
        action: "UPDATE",
        newValue: { symbol, marketType, baseCurrency, quoteCurrency },
        userId: user.id,
        reason: "Market added",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Market added");
    return leaderMarket;
};
