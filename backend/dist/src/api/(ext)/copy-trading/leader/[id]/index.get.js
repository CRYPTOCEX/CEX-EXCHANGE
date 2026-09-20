"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const stats_calculator_1 = require("@b/api/(ext)/copy-trading/utils/stats-calculator");
const native_binary_1 = require("../../utils/native-binary");
const mobile_shape_1 = require("@b/utils/mobile-shape");
const display_name_1 = require("@b/utils/display-name");
exports.metadata = {
    summary: "Get Copy Trading Leader Details",
    description: "Retrieves detailed information about a specific leader.",
    operationId: "getCopyTradingLeader",
    tags: ["Copy Trading", "Leaders"],
    requiresAuth: false,
    logModule: "COPY",
    logTitle: "Get leader details",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Leader ID",
        },
    ],
    responses: {
        200: {
            description: "Leader details retrieved successfully",
            content: {
                "application/json": {
                    schema: { type: "object" },
                },
            },
        },
        404: { description: "Leader not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { params, user, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching leader");
    const leader = await db_1.models.copyTradingLeader.findOne({
        where: {
            id,
            status: "ACTIVE",
        },
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", ...display_name_1.PUBLIC_NAME_ATTRIBUTES, "avatar"],
            },
            {
                model: db_1.models.copyTradingLeaderMarket,
                as: "markets",
                where: { isActive: true },
                required: false,
            },
        ],
    });
    if (!leader) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Leader not found" });
    }
    const isOwnProfile = (user === null || user === void 0 ? void 0 : user.id) === leader.userId;
    if (!leader.isPublic && !isOwnProfile) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Leader not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching daily stats");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyStats = await db_1.models.copyTradingLeaderStats.findAll({
        where: {
            leaderId: id,
            date: { [sequelize_1.Op.gte]: thirtyDaysAgo.toISOString().split("T")[0] },
        },
        order: [["date", "ASC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching recent trades");
    const recentTrades = await db_1.models.copyTradingTrade.findAll({
        where: {
            leaderId: id,
            isLeaderTrade: true,
            status: "CLOSED",
        },
        order: [["closedAt", "DESC"]],
        limit: 10,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking user follow status");
    let isFollowing = false;
    let followerId = null;
    let followerStatus = null;
    if ((user === null || user === void 0 ? void 0 : user.id) && !isOwnProfile) {
        const follow = await db_1.models.copyTradingFollower.findOne({
            where: {
                userId: user.id,
                leaderId: id,
                status: { [sequelize_1.Op.in]: ["ACTIVE", "PAUSED"] },
            },
        });
        if (follow) {
            isFollowing = true;
            followerId = follow.id;
            followerStatus = follow.status;
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating leader stats");
    const stats = await (0, stats_calculator_1.getLeaderStats)(id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Leader details retrieved");
    const payload = {
        ...leader.toJSON(),
        ...stats,
        dailyStats: dailyStats.map((s) => s.toJSON()),
        recentTrades: recentTrades.map((t) => ({
            id: t.id,
            symbol: t.symbol,
            marketType: t.marketType,
            side: t.side,
            binaryResult: t.binaryResult,
            profit: t.profit,
            profitPercent: t.profitPercent,
            profitCurrency: t.profitCurrency,
            closedAt: t.closedAt,
        })),
        isFollowing,
        followerId,
        followerStatus,
        isOwnProfile,
    };
    const shaped = (0, mobile_shape_1.shapeForClient)((0, native_binary_1.stripBinaryForNative)(payload, data), data);
    return isOwnProfile ? shaped : (0, display_name_1.redactPublicNames)(shaped);
};
