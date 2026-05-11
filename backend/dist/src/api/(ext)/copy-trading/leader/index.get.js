"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const stats_calculator_1 = require("@b/api/(ext)/copy-trading/utils/stats-calculator");
exports.metadata = {
    summary: "Get Available Copy Trading Leaders",
    description: "Retrieves all active public leaders available for copy trading.",
    operationId: "getCopyTradingLeaders",
    tags: ["Copy Trading", "Leaders"],
    requiresAuth: false,
    logModule: "COPY",
    logTitle: "Get leaders list",
    parameters: [
        {
            name: "tradingStyle",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["SCALPING", "DAY_TRADING", "SWING", "POSITION"] },
            description: "Filter by trading style",
        },
        {
            name: "riskLevel",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            description: "Filter by risk level",
        },
        {
            name: "minWinRate",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Minimum win rate filter",
        },
        {
            name: "minRoi",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Minimum ROI filter",
        },
        {
            name: "sortBy",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["roi", "winRate", "totalFollowers", "totalProfit"] },
            description: "Sort field",
        },
        {
            name: "sortOrder",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["asc", "desc"] },
            description: "Sort order",
        },
        {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Page number",
        },
        {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Items per page",
        },
    ],
    responses: {
        200: {
            description: "Leaders retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: { type: "array", items: { type: "object" } },
                            pagination: {
                                type: "object",
                                properties: {
                                    total: { type: "number" },
                                    page: { type: "number" },
                                    limit: { type: "number" },
                                    totalPages: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    var _a;
    const { query, user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching leaders");
    const whereClause = {
        status: "ACTIVE",
        isPublic: true,
    };
    if (query.tradingStyle) {
        whereClause.tradingStyle = query.tradingStyle;
    }
    if (query.riskLevel) {
        whereClause.riskLevel = query.riskLevel;
    }
    const minWinRate = query.minWinRate ? parseFloat(query.minWinRate) : null;
    const minRoi = query.minRoi ? parseFloat(query.minRoi) : null;
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const sortBy = query.sortBy || "roi";
    const sortOrder = ((_a = query.sortOrder) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === "ASC" ? "ASC" : "DESC";
    const leaders = await db_1.models.copyTradingLeader.findAll({
        where: whereClause,
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "avatar"],
            },
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating stats for leaders");
    const leaderIds = leaders.map((l) => l.id);
    const statsMap = await (0, stats_calculator_1.calculateBatchLeaderStats)(leaderIds);
    let leadersWithStats = leaders.map((leader) => {
        const stats = statsMap.get(leader.id) || {
            totalFollowers: 0,
            totalTrades: 0,
            winRate: 0,
            totalProfit: 0,
            totalVolume: 0,
            roi: 0,
        };
        return {
            ...leader.toJSON(),
            ...stats,
        };
    });
    if (minWinRate !== null) {
        leadersWithStats = leadersWithStats.filter((l) => l.winRate >= minWinRate);
    }
    if (minRoi !== null) {
        leadersWithStats = leadersWithStats.filter((l) => l.roi >= minRoi);
    }
    leadersWithStats.sort((a, b) => {
        const aValue = a[sortBy] || 0;
        const bValue = b[sortBy] || 0;
        return sortOrder === "ASC" ? aValue - bValue : bValue - aValue;
    });
    const count = leadersWithStats.length;
    const offset = (page - 1) * limit;
    const paginatedLeaders = leadersWithStats.slice(offset, offset + limit);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking user follows");
    let followingMap = {};
    if (user === null || user === void 0 ? void 0 : user.id) {
        const userFollows = await db_1.models.copyTradingFollower.findAll({
            where: {
                userId: user.id,
                leaderId: paginatedLeaders.map((l) => l.id),
                status: { [sequelize_1.Op.ne]: "STOPPED" },
            },
            attributes: ["leaderId"],
        });
        followingMap = userFollows.reduce((acc, f) => {
            acc[f.leaderId] = true;
            return acc;
        }, {});
    }
    const enhancedLeaders = paginatedLeaders.map((leader) => ({
        ...leader,
        isFollowing: followingMap[leader.id] || false,
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Found ${count} leaders`);
    return {
        items: enhancedLeaders,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    };
};
