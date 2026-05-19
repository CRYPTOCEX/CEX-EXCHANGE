"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Remove a market from leader's list",
    description: "Deactivates a market from the leader's declared trading markets. Cannot remove markets with open positions. Followers' allocations for this market will be deactivated.",
    operationId: "removeLeaderMarket",
    tags: ["Copy Trading", "Leader"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Remove leader market",
    parameters: [
        {
            name: "symbol",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Market symbol (URL encoded, e.g., BTC%2FUSDT)",
        },
    ],
    responses: {
        200: {
            description: "Market removed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            deactivatedAllocations: { type: "number" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request - Has open positions" },
        401: { description: "Unauthorized" },
        404: { description: "Leader or Market not found" },
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const symbol = decodeURIComponent(params.symbol);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding leader profile");
    const leader = await db_1.models.copyTradingLeader.findOne({
        where: { userId: user.id },
    });
    if (!leader) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Leader not found" });
    }
    const leaderId = leader.id;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for open positions");
    const openTrades = await db_1.models.copyTradingTrade.count({
        where: {
            leaderId,
            symbol,
            status: { [sequelize_1.Op.in]: ["OPEN", "PENDING", "PARTIALLY_FILLED"] },
        },
    });
    if (openTrades > 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot remove market with ${openTrades} open positions. Please close all trades first.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding market");
    const leaderMarket = await db_1.models.copyTradingLeaderMarket.findOne({
        where: { leaderId, symbol },
    });
    if (!leaderMarket) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Market not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deactivating market");
    await leaderMarket.update({ isActive: false });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deactivating follower allocations");
    let deactivatedAllocations = 0;
    try {
        const followers = await db_1.models.copyTradingFollower.findAll({
            where: { leaderId },
            attributes: ["id"],
        });
        const followerIds = followers.map((f) => f.id);
        if (followerIds.length > 0) {
            const [affectedCount] = await db_1.models.copyTradingFollowerAllocation.update({ isActive: false }, {
                where: {
                    followerId: { [sequelize_1.Op.in]: followerIds },
                    symbol,
                    isActive: true,
                },
            });
            deactivatedAllocations = affectedCount;
            if (deactivatedAllocations > 0) {
                console_1.logger.info("COPY_TRADING", `Deactivated ${deactivatedAllocations} follower allocations for ${symbol} when leader ${leaderId} removed market`);
            }
        }
    }
    catch (error) {
        console_1.logger.error("COPY_TRADING", `Error deactivating follower allocations: ${error.message}`);
    }
    await (0, utils_1.createAuditLog)({
        entityType: "LEADER",
        entityId: leaderId,
        action: "UPDATE",
        oldValue: { symbol, isActive: true },
        newValue: { symbol, isActive: false, deactivatedAllocations },
        userId: user.id,
        reason: "Market removed",
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Market removed");
    return {
        success: true,
        message: `Market removed successfully. ${deactivatedAllocations} follower allocation(s) deactivated.`,
        deactivatedAllocations,
    };
};
