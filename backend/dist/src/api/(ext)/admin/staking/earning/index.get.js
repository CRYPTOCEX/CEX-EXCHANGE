"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Aggregated Earnings",
    description: "Retrieves aggregated earnings data including overall totals, per-pool breakdown, and a detailed history of admin earnings with computed user earnings and position counts.",
    operationId: "getAggregatedEarnings",
    tags: ["Staking", "Admin", "Earnings"],
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Get Staking Earnings",
    parameters: [
        {
            index: 0,
            name: "poolId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter earnings by pool ID",
        },
        {
            index: 1,
            name: "startDate",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Filter earnings by start date",
        },
        {
            index: 2,
            name: "endDate",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Filter earnings by end date",
        },
    ],
    responses: {
        200: {
            description: "Aggregated earnings retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            totals: {
                                type: "object",
                                properties: {
                                    totalUserEarnings: { type: "number" },
                                    totalAdminEarnings: { type: "number" },
                                    totalEarnings: { type: "number" },
                                },
                            },
                            earningsByPool: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        poolId: { type: "string" },
                                        poolName: { type: "string" },
                                        totalUserEarnings: { type: "number" },
                                        totalAdminEarnings: { type: "number" },
                                        totalEarnings: { type: "number" },
                                    },
                                },
                            },
                            history: {
                                type: "array",
                                items: { type: "object" },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
    permission: "view.staking.earning",
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
        const adminWhere = {};
        const userWhere = {};
        if (query === null || query === void 0 ? void 0 : query.poolId) {
            adminWhere.poolId = query.poolId;
        }
        if (query === null || query === void 0 ? void 0 : query.startDate) {
            const start = new Date(query.startDate);
            adminWhere.createdAt = {
                ...(adminWhere.createdAt || {}),
                [sequelize_1.Op.gte]: start,
            };
            userWhere.createdAt = { ...(userWhere.createdAt || {}), [sequelize_1.Op.gte]: start };
        }
        if (query === null || query === void 0 ? void 0 : query.endDate) {
            const end = new Date(query.endDate);
            adminWhere.createdAt = { ...(adminWhere.createdAt || {}), [sequelize_1.Op.lte]: end };
            userWhere.createdAt = { ...(userWhere.createdAt || {}), [sequelize_1.Op.lte]: end };
        }
        const adminEarningsRecords = (await db_1.models.stakingAdminEarning.findAll({
            where: adminWhere,
            raw: true,
        }));
        const aggregatedAdminByPool = {};
        let totalAdminEarnings = 0;
        for (const rec of adminEarningsRecords) {
            const poolId = rec.poolId;
            aggregatedAdminByPool[poolId] =
                (aggregatedAdminByPool[poolId] || 0) + rec.amount;
            totalAdminEarnings += rec.amount;
        }
        const userEarningsAggregates = (await db_1.models.stakingEarningRecord.findAll({
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("stakingEarningRecord.amount")), "totalUserEarnings"],
                [(0, sequelize_1.col)("position.poolId"), "poolId"],
            ],
            include: [
                {
                    model: db_1.models.stakingPosition,
                    as: "position",
                    attributes: [],
                    where: (query === null || query === void 0 ? void 0 : query.poolId) ? { poolId: query.poolId } : undefined,
                },
            ],
            where: userWhere,
            group: ["position.poolId"],
            raw: true,
        }));
        const aggregatedUserByPool = {};
        let totalUserEarnings = 0;
        for (const row of userEarningsAggregates) {
            const poolId = row.poolId;
            const sumUser = parseFloat(row.totalUserEarnings) || 0;
            aggregatedUserByPool[poolId] = sumUser;
            totalUserEarnings += sumUser;
        }
        const totalEarnings = totalAdminEarnings + totalUserEarnings;
        const poolIds = new Set([
            ...Object.keys(aggregatedAdminByPool),
            ...Object.keys(aggregatedUserByPool),
        ]);
        const earningsByPool = [];
        for (const poolId of poolIds) {
            const pool = await db_1.models.stakingPool.findByPk(poolId, { raw: true });
            earningsByPool.push({
                poolId,
                poolName: pool ? pool.name : "Unknown",
                totalUserEarnings: aggregatedUserByPool[poolId] || 0,
                totalAdminEarnings: aggregatedAdminByPool[poolId] || 0,
                totalEarnings: (aggregatedUserByPool[poolId] || 0) +
                    (aggregatedAdminByPool[poolId] || 0),
            });
        }
        const history = await Promise.all(adminEarningsRecords.map(async (adminRec) => {
            const startDate = new Date(adminRec.createdAt);
            const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
            const userAgg = (await db_1.models.stakingEarningRecord.findOne({
                attributes: [
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("stakingEarningRecord.amount")), "userEarnings"],
                    [
                        (0, sequelize_1.fn)("COUNT", (0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("position.id"))),
                        "numberOfPositions",
                    ],
                ],
                include: [
                    {
                        model: db_1.models.stakingPosition,
                        as: "position",
                        attributes: [],
                        where: { poolId: adminRec.poolId },
                    },
                ],
                where: {
                    createdAt: {
                        [sequelize_1.Op.gte]: startDate,
                        [sequelize_1.Op.lt]: endDate,
                    },
                },
                raw: true,
            }));
            const userEarnings = parseFloat(userAgg === null || userAgg === void 0 ? void 0 : userAgg.userEarnings) || 0;
            const numberOfPositions = parseInt(userAgg === null || userAgg === void 0 ? void 0 : userAgg.numberOfPositions) || 0;
            return {
                id: adminRec.id,
                poolId: adminRec.poolId,
                createdAt: adminRec.createdAt,
                adminEarnings: adminRec.amount,
                userEarnings,
                numberOfPositions,
            };
        }));
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Staking earnings retrieved successfully");
        return {
            totals: { totalUserEarnings, totalAdminEarnings, totalEarnings },
            earningsByPool,
            history,
        };
    }
    catch (error) {
        console.error("Error fetching aggregated earnings:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch aggregated earnings",
        });
    }
};
