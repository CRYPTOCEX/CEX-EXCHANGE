"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get leader's declared markets",
    description: "Returns all markets the authenticated leader has declared for trading with follower counts",
    operationId: "getLeaderMarkets",
    tags: ["Copy Trading", "Leader"],
    requiresAuth: true,
    logModule: "COPY",
    logTitle: "Get leader markets",
    responses: {
        200: {
            description: "Markets retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                symbol: { type: "string" },
                                baseCurrency: { type: "string" },
                                quoteCurrency: { type: "string" },
                                isActive: { type: "boolean" },
                                followerCount: { type: "number" },
                                createdAt: { type: "string" },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        404: { description: "Leader profile not found" },
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding leader profile");
    const leader = await db_1.models.copyTradingLeader.findOne({
        where: { userId: user.id },
    });
    if (!leader) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Leader profile not found" });
    }
    const leaderId = leader.id;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching leader markets");
    const markets = await db_1.models.copyTradingLeaderMarket.findAll({
        where: { leaderId },
        order: [["createdAt", "ASC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching follower counts per market");
    const followerCounts = await db_1.models.copyTradingFollowerAllocation.findAll({
        attributes: [
            "symbol",
            [db_1.sequelize.fn("COUNT", db_1.sequelize.fn("DISTINCT", db_1.sequelize.col("copyTradingFollowerAllocation.followerId"))), "count"],
        ],
        where: { isActive: true },
        include: [
            {
                model: db_1.models.copyTradingFollower,
                as: "follower",
                where: { leaderId },
                attributes: [],
            },
        ],
        group: ["symbol"],
        raw: true,
    });
    const countMap = new Map(followerCounts.map((c) => [c.symbol, parseInt(c.count, 10)]));
    const marketsWithCounts = markets.map((m) => {
        const market = m.toJSON();
        market.followerCount = countMap.get(market.symbol) || 0;
        return market;
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${markets.length} markets`);
    return marketsWithCounts;
};
