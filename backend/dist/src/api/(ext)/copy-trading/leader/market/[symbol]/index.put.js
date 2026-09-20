"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const settings_core_1 = require("@b/api/(ext)/copy-trading/utils/settings-core");
const native_binary_1 = require("../../../utils/native-binary");
exports.metadata = {
    summary: "Update leader market settings",
    description: "Update settings for a market, such as minimum allocation amounts for base and quote currencies.",
    operationId: "updateLeaderMarket",
    tags: ["Copy Trading", "Leader"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Update leader market",
    parameters: [
        {
            name: "symbol",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Market symbol (URL encoded, e.g., BTC%2FUSDT)",
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        minBase: {
                            type: "number",
                            description: "Minimum base currency allocation amount",
                        },
                        minQuote: {
                            type: "number",
                            description: "Minimum quote currency allocation amount",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Market updated successfully",
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
    const { user, params, body, ctx } = data;
    (0, native_binary_1.assertNotBinaryOnNativeApp)(data, body === null || body === void 0 ? void 0 : body.marketType, "change a binary market");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const symbol = decodeURIComponent(params.symbol);
    const { minBase, minQuote } = body;
    const marketType = body.marketType === "BINARY" ? "BINARY" : "SPOT";
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
    const leaderId = leader.id;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding market");
    const leaderMarket = await db_1.models.copyTradingLeaderMarket.findOne({
        where: { leaderId, symbol, marketType },
    });
    if (!leaderMarket) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Market not found" });
    }
    const oldValues = {
        minBase: leaderMarket.minBase,
        minQuote: leaderMarket.minQuote,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating market settings");
    const updateData = {};
    if (typeof minBase === "number" && minBase >= 0) {
        updateData.minBase = minBase;
    }
    if (typeof minQuote === "number" && minQuote >= 0) {
        updateData.minQuote = minQuote;
    }
    if (Object.keys(updateData).length === 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "No valid fields to update",
        });
    }
    await leaderMarket.update(updateData);
    await (0, settings_core_1.createAuditLog)({
        entityType: "LEADER",
        entityId: leaderId,
        action: "UPDATE",
        oldValue: oldValues,
        newValue: updateData,
        userId: user.id,
        reason: "Market settings updated",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Market settings updated");
    return leaderMarket;
};
