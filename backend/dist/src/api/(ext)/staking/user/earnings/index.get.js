"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get User's Staking Earnings",
    description: "Retrieves all staking earnings for the authenticated user across all positions.",
    operationId: "getUserStakingEarnings",
    tags: ["Staking", "User", "Earnings"],
    requiresAuth: true,
    logModule: "STAKE",
    logTitle: "Get User Earnings",
    parameters: [
        {
            index: 0,
            name: "claimed",
            in: "query",
            required: false,
            schema: { type: "boolean" },
            description: "Filter by claimed status",
        },
        {
            index: 1,
            name: "poolId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter by pool ID",
        },
        {
            index: 2,
            name: "timeframe",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["week", "month", "year", "all"] },
            description: "Timeframe for earnings data",
        },
    ],
    responses: {
        200: {
            description: "Earnings retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            earnings: {
                                type: "array",
                                items: {
                                    type: "object",
                                },
                            },
                            summary: {
                                type: "object",
                                properties: {
                                    total: { type: "number" },
                                    claimed: { type: "number" },
                                    unclaimed: { type: "number" },
                                    byToken: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                tokenSymbol: { type: "string" },
                                                total: { type: "number" },
                                                claimed: { type: "number" },
                                                unclaimed: { type: "number" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const now = new Date();
    let startDate;
    switch (query.timeframe) {
        case "week":
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
        case "month":
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
        case "year":
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        case "all":
        default:
            startDate = new Date(0);
            break;
    }
    const positionWhere = { userId: user.id };
    if (query.poolId) {
        positionWhere.poolId = query.poolId;
    }
    const positions = await db_1.models.stakingPosition.findAll({
        where: positionWhere,
        attributes: ["id"],
    });
    const positionIds = positions.map((p) => p.id);
    if (positionIds.length === 0) {
        return {
            earnings: [],
            summary: {
                total: 0,
                claimed: 0,
                unclaimed: 0,
                byToken: [],
            },
        };
    }
    const whereClause = {
        positionId: { [sequelize_1.Op.in]: positionIds },
        createdAt: { [sequelize_1.Op.gte]: startDate },
    };
    if (query.claimed !== undefined) {
        whereClause.isClaimed = query.claimed === "true";
    }
    const earnings = await db_1.models.stakingEarningRecord.findAll({
        where: whereClause,
        include: [
            {
                model: db_1.models.stakingPosition,
                as: "position",
                attributes: ["id", "amount", "status", "poolId"],
                include: [
                    {
                        model: db_1.models.stakingPool,
                        as: "pool",
                        attributes: ["id", "name", "apr", "symbol", "icon"],
                    },
                ],
            },
        ],
        order: [["createdAt", "DESC"]],
    });
    const total = earnings.reduce((sum, record) => sum + record.amount, 0);
    const claimed = earnings
        .filter((record) => record.isClaimed)
        .reduce((sum, record) => sum + record.amount, 0);
    const unclaimed = total - claimed;
    const tokenSummary = {};
    earnings.forEach((record) => {
        const position = record.position;
        const pool = position === null || position === void 0 ? void 0 : position.pool;
        if (!pool)
            return;
        const tokenSymbol = pool.symbol;
        if (!tokenSummary[tokenSymbol]) {
            tokenSummary[tokenSymbol] = {
                tokenSymbol,
                tokenIcon: pool.icon,
                total: 0,
                claimed: 0,
                unclaimed: 0,
            };
        }
        tokenSummary[tokenSymbol].total += record.amount;
        if (record.isClaimed) {
            tokenSummary[tokenSymbol].claimed += record.amount;
        }
        else {
            tokenSummary[tokenSymbol].unclaimed += record.amount;
        }
    });
    const earningsByDay = await db_1.models.stakingEarningRecord.findAll({
        attributes: [
            [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt")), "date"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalAmount"],
        ],
        where: whereClause,
        group: [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt"))],
        order: [[(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt")), "ASC"]],
        raw: true,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${earnings.length} earning records`);
    return {
        earnings,
        summary: {
            total,
            claimed,
            unclaimed,
            byToken: Object.values(tokenSummary),
            earningsByDay,
        },
    };
};
