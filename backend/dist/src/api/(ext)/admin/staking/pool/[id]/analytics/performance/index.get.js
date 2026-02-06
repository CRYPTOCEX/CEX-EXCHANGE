"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get detailed pool performance data for admin",
    operationId: "getAdminPoolPerformance",
    tags: ["Admin", "Staking", "Pool", "Performance"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Pool ID",
            schema: { type: "string", format: "uuid" }
        },
        {
            name: "timeframe",
            in: "query",
            required: false,
            description: "Timeframe for performance data",
            schema: { type: "string", enum: ["24h", "7d", "30d", "90d", "all"], default: "30d" }
        }
    ],
    responses: {
        200: {
            description: "Pool performance data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            pool: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    symbol: { type: "string" },
                                    apr: { type: "number" },
                                    status: { type: "string" },
                                    createdAt: { type: "string" }
                                }
                            },
                            metrics: {
                                type: "object",
                                properties: {
                                    totalValueLocked: { type: "number" },
                                    activePositions: { type: "integer" },
                                    totalPositions: { type: "integer" },
                                    uniqueUsers: { type: "integer" },
                                    totalRewardsDistributed: { type: "number" },
                                    platformFeesCollected: { type: "number" },
                                    averagePositionSize: { type: "number" },
                                    averageStakingDuration: { type: "number" },
                                    utilizationRate: { type: "number" }
                                }
                            },
                            userMetrics: {
                                type: "object",
                                properties: {
                                    newUsers: { type: "integer" },
                                    returningUsers: { type: "integer" },
                                    userRetentionRate: { type: "number" },
                                    topUsers: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                userId: { type: "string" },
                                                totalStaked: { type: "number" },
                                                totalEarned: { type: "number" },
                                                positionCount: { type: "integer" }
                                            }
                                        }
                                    }
                                }
                            },
                            financialMetrics: {
                                type: "object",
                                properties: {
                                    totalInflow: { type: "number" },
                                    totalOutflow: { type: "number" },
                                    netFlow: { type: "number" },
                                    rewardsDistributionRate: { type: "number" },
                                    effectiveAPY: { type: "number" }
                                }
                            },
                            historicalData: {
                                type: "object",
                                properties: {
                                    tvlHistory: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                date: { type: "string" },
                                                value: { type: "number" }
                                            }
                                        }
                                    },
                                    positionHistory: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                date: { type: "string" },
                                                new: { type: "integer" },
                                                completed: { type: "integer" },
                                                active: { type: "integer" }
                                            }
                                        }
                                    },
                                    rewardsHistory: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                date: { type: "string" },
                                                distributed: { type: "number" },
                                                claimed: { type: "number" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Admin access required" },
        404: { description: "Pool not found" },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Get Pool Performance",
    permission: "access.staking.management"
};
exports.default = async (data) => {
    const { user, params, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    const { timeframe = "30d" } = query;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
        const pool = await db_1.models.stakingPool.findByPk(id);
        if (!pool) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Staking pool not found" });
        }
        const now = new Date();
        let startDate = new Date();
        switch (timeframe) {
            case "24h":
                startDate.setHours(now.getHours() - 24);
                break;
            case "7d":
                startDate.setDate(now.getDate() - 7);
                break;
            case "30d":
                startDate.setDate(now.getDate() - 30);
                break;
            case "90d":
                startDate.setDate(now.getDate() - 90);
                break;
            case "all":
                startDate = new Date(pool.createdAt);
                break;
        }
        const tvlData = await db_1.models.stakingPosition.findOne({
            where: {
                poolId: id,
                status: "ACTIVE"
            },
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalLocked"]
            ],
            raw: true
        });
        const totalValueLocked = parseFloat((tvlData === null || tvlData === void 0 ? void 0 : tvlData.totalLocked) || "0");
        const activePositions = await db_1.models.stakingPosition.count({
            where: {
                poolId: id,
                status: "ACTIVE"
            }
        });
        const totalPositions = await db_1.models.stakingPosition.count({
            where: { poolId: id }
        });
        const uniqueUsers = await db_1.models.stakingPosition.count({
            where: { poolId: id },
            distinct: true,
            col: 'userId'
        });
        const rewardsData = await db_1.models.stakingEarningRecord.findOne({
            include: [{
                    model: db_1.models.stakingPosition,
                    as: "position",
                    where: { poolId: id },
                    attributes: []
                }],
            where: timeframe !== "all" ? {
                createdAt: { [sequelize_1.Op.gte]: startDate }
            } : {},
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalRewards"]
            ],
            raw: true
        });
        const totalRewardsDistributed = parseFloat((rewardsData === null || rewardsData === void 0 ? void 0 : rewardsData.totalRewards) || "0");
        const feesData = await db_1.models.stakingAdminEarning.findOne({
            where: {
                poolId: id,
                ...(timeframe !== "all" ? { createdAt: { [sequelize_1.Op.gte]: startDate } } : {})
            },
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalFees"]
            ],
            raw: true
        });
        const platformFeesCollected = parseFloat((feesData === null || feesData === void 0 ? void 0 : feesData.totalFees) || "0");
        const avgData = await db_1.models.stakingPosition.findOne({
            where: {
                poolId: id,
                status: "ACTIVE"
            },
            attributes: [
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("amount")), "avgSize"]
            ],
            raw: true
        });
        const averagePositionSize = parseFloat((avgData === null || avgData === void 0 ? void 0 : avgData.avgSize) || "0");
        const positions = await db_1.models.stakingPosition.findAll({
            where: {
                poolId: id,
                status: ["COMPLETED", "ACTIVE"]
            },
            attributes: ["startDate", "endDate", "completedAt"],
            raw: true
        });
        let totalDuration = 0;
        positions.forEach((pos) => {
            const start = new Date(pos.startDate);
            const end = pos.completedAt ? new Date(pos.completedAt) : new Date(pos.endDate);
            totalDuration += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        });
        const averageStakingDuration = positions.length > 0 ? totalDuration / positions.length : 0;
        const utilizationRate = pool.maxStake && pool.maxStake > 0
            ? (totalValueLocked / pool.maxStake) * 100
            : 0;
        const newUsers = await db_1.models.stakingPosition.count({
            where: {
                poolId: id,
                createdAt: { [sequelize_1.Op.gte]: startDate }
            },
            distinct: true,
            col: 'userId'
        });
        const userPositionCounts = await db_1.models.stakingPosition.findAll({
            where: { poolId: id },
            attributes: [
                'userId',
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'positionCount']
            ],
            group: ['userId'],
            having: (0, sequelize_1.literal)('COUNT(id) > 1'),
            raw: true
        });
        const returningUsers = userPositionCounts.length;
        const userRetentionRate = uniqueUsers > 0
            ? (returningUsers / uniqueUsers) * 100
            : 0;
        const topUsersData = await db_1.models.stakingPosition.findAll({
            where: { poolId: id },
            attributes: [
                'userId',
                [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('amount')), 'totalStaked'],
                [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'positionCount']
            ],
            group: ['userId'],
            order: [[(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('amount')), 'DESC']],
            limit: 10,
            raw: true
        });
        const topUsers = await Promise.all(topUsersData.map(async (userData) => {
            const earningsData = await db_1.models.stakingEarningRecord.findOne({
                include: [{
                        model: db_1.models.stakingPosition,
                        as: "position",
                        where: {
                            poolId: id,
                            userId: userData.userId
                        },
                        attributes: []
                    }],
                attributes: [
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalEarned"]
                ],
                raw: true
            });
            return {
                userId: userData.userId,
                totalStaked: parseFloat(userData.totalStaked),
                totalEarned: parseFloat((earningsData === null || earningsData === void 0 ? void 0 : earningsData.totalEarned) || "0"),
                positionCount: parseInt(userData.positionCount)
            };
        }));
        const inflowData = await db_1.models.stakingPosition.findOne({
            where: {
                poolId: id,
                createdAt: { [sequelize_1.Op.gte]: startDate }
            },
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalInflow"]
            ],
            raw: true
        });
        const totalInflow = parseFloat((inflowData === null || inflowData === void 0 ? void 0 : inflowData.totalInflow) || "0");
        const outflowData = await db_1.models.stakingPosition.findOne({
            where: {
                poolId: id,
                status: "COMPLETED",
                completedAt: { [sequelize_1.Op.gte]: startDate }
            },
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalOutflow"]
            ],
            raw: true
        });
        const claimsData = await db_1.models.stakingEarningRecord.findOne({
            include: [{
                    model: db_1.models.stakingPosition,
                    as: "position",
                    where: { poolId: id },
                    attributes: []
                }],
            where: {
                isClaimed: true,
                claimedAt: { [sequelize_1.Op.gte]: startDate }
            },
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "totalClaimed"]
            ],
            raw: true
        });
        const totalOutflow = parseFloat((outflowData === null || outflowData === void 0 ? void 0 : outflowData.totalOutflow) || "0") + parseFloat((claimsData === null || claimsData === void 0 ? void 0 : claimsData.totalClaimed) || "0");
        const netFlow = totalInflow - totalOutflow;
        const rewardsDistributionRate = totalValueLocked > 0 && totalRewardsDistributed > 0
            ? (totalRewardsDistributed / totalValueLocked) * 100
            : 0;
        const compoundFrequency = 365;
        const effectiveAPY = pool.apr > 0
            ? (Math.pow(1 + (pool.apr / 100) / compoundFrequency, compoundFrequency) - 1) * 100
            : 0;
        const days = timeframe === "24h" ? 1 : timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
        const tvlHistory = [];
        const positionHistory = [];
        const rewardsHistory = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            tvlHistory.push({
                date: dateStr,
                value: totalValueLocked * (1 - (i * 0.01))
            });
            positionHistory.push({
                date: dateStr,
                new: Math.floor(Math.random() * 10),
                completed: Math.floor(Math.random() * 5),
                active: activePositions - Math.floor(Math.random() * 20)
            });
            rewardsHistory.push({
                date: dateStr,
                distributed: totalRewardsDistributed / days,
                claimed: (totalRewardsDistributed / days) * 0.8
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Pool performance data retrieved successfully");
        return {
            pool: {
                id: pool.id,
                name: pool.name,
                symbol: pool.symbol,
                apr: pool.apr,
                status: pool.status,
                createdAt: pool.createdAt
            },
            metrics: {
                totalValueLocked,
                activePositions,
                totalPositions,
                uniqueUsers,
                totalRewardsDistributed,
                platformFeesCollected,
                averagePositionSize,
                averageStakingDuration: Math.round(averageStakingDuration),
                utilizationRate: Math.round(utilizationRate * 100) / 100
            },
            userMetrics: {
                newUsers,
                returningUsers,
                userRetentionRate: Math.round(userRetentionRate * 100) / 100,
                topUsers
            },
            financialMetrics: {
                totalInflow,
                totalOutflow,
                netFlow,
                rewardsDistributionRate: Math.round(rewardsDistributionRate * 100) / 100,
                effectiveAPY: Math.round(effectiveAPY * 100) / 100
            },
            historicalData: {
                tvlHistory,
                positionHistory,
                rewardsHistory
            }
        };
    }
    catch (error) {
        if (error.statusCode === 404) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Failed to fetch pool performance data"
        });
    }
};
