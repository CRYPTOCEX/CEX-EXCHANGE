"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const stats_calculator_1 = require("@b/api/(ext)/copy-trading/utils/stats-calculator");
exports.metadata = {
    summary: "Get My Leader Profile",
    description: "Retrieves the current user's leader profile if they are a leader.",
    operationId: "getMyLeaderProfile",
    tags: ["Copy Trading", "Leaders"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Get my leader profile",
    responses: {
        200: {
            description: "Leader profile retrieved successfully",
            content: {
                "application/json": {
                    schema: { type: "object" },
                },
            },
        },
        401: { description: "Unauthorized" },
        404: { description: "Not a leader" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching leader profile");
    const leader = await db_1.models.copyTradingLeader.findOne({
        where: { userId: user.id },
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
        ],
    });
    if (!leader) {
        throw (0, error_1.createError)({ statusCode: 404, message: "You are not a leader" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching follower stats");
    const followerStats = await db_1.models.copyTradingFollower.findAll({
        where: { leaderId: leader.id },
        attributes: [
            "status",
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
        ],
        group: ["status"],
        raw: true,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching recent transactions");
    const recentTransactions = await db_1.models.copyTradingTransaction.findAll({
        where: {
            leaderId: leader.id,
            type: "PROFIT_SHARE",
        },
        order: [["createdAt", "DESC"]],
        limit: 10,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching recent trades");
    const recentTrades = await db_1.models.copyTradingTrade.findAll({
        where: {
            leaderId: leader.id,
            isLeaderTrade: true,
        },
        order: [["createdAt", "DESC"]],
        limit: 10,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating leader stats");
    const stats = await (0, stats_calculator_1.getLeaderStats)(leader.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Leader profile retrieved");
    return {
        ...leader.toJSON(),
        ...stats,
        followerStats: followerStats.reduce((acc, stat) => {
            acc[stat.status] = {
                count: parseInt(stat.count),
            };
            return acc;
        }, {}),
        recentTransactions: recentTransactions.map((t) => t.toJSON()),
        recentTrades: recentTrades.map((t) => t.toJSON()),
    };
};
