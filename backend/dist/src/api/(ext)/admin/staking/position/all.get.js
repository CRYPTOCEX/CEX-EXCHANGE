"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Staking Positions",
    description: "Retrieves all staking positions with optional filtering by pool ID and status.",
    operationId: "getStakingPositions",
    tags: ["Staking", "Admin", "Positions"],
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Get All Positions",
    parameters: [
        {
            index: 0,
            name: "poolId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter positions by pool ID",
        },
        {
            index: 1,
            name: "status",
            in: "query",
            required: false,
            schema: {
                type: "string",
                enum: ["ACTIVE", "COMPLETED", "CANCELLED", "PENDING_WITHDRAWAL"],
            },
            description: "Filter positions by status",
        },
    ],
    responses: {
        200: {
            description: "Positions retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
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
    permission: "view.staking.position",
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
        const where = {};
        if (query === null || query === void 0 ? void 0 : query.poolId) {
            where.poolId = query.poolId;
        }
        if (query === null || query === void 0 ? void 0 : query.status) {
            where.status = query.status;
        }
        const positions = await db_1.models.stakingPosition.findAll({
            where,
            include: [
                {
                    model: db_1.models.stakingPool,
                    as: "pool",
                },
                {
                    model: db_1.models.stakingEarningRecord,
                    as: "earningHistory",
                    required: false,
                },
            ],
            order: [["createdAt", "DESC"]],
        });
        const positionsWithComputedProps = await Promise.all(positions.map(async (position) => {
            var _a, _b, _c, _d;
            const pendingRewardsResult = await db_1.models.stakingEarningRecord.findOne({
                attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "pendingRewards"]],
                where: {
                    positionId: position.id,
                    isClaimed: false,
                },
                raw: true,
            });
            const pendingRewards = parseFloat((pendingRewardsResult === null || pendingRewardsResult === void 0 ? void 0 : pendingRewardsResult.pendingRewards) || "0");
            const earningsToDateResult = await db_1.models.stakingEarningRecord.findOne({
                attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "earningsToDate"]],
                where: {
                    positionId: position.id,
                },
                raw: true,
            });
            const earningsToDate = parseFloat((earningsToDateResult === null || earningsToDateResult === void 0 ? void 0 : earningsToDateResult.earningsToDate) || "0");
            const lastEarningRecord = await db_1.models.stakingEarningRecord.findOne({
                attributes: ["createdAt"],
                where: {
                    positionId: position.id,
                },
                order: [["createdAt", "DESC"]],
                raw: true,
            });
            const lastEarningDate = (lastEarningRecord === null || lastEarningRecord === void 0 ? void 0 : lastEarningRecord.createdAt) || null;
            return {
                ...position.toJSON(),
                pendingRewards,
                earningsToDate,
                lastEarningDate,
                rewardTokenSymbol: (_a = position.pool) === null || _a === void 0 ? void 0 : _a.symbol,
                tokenSymbol: (_b = position.pool) === null || _b === void 0 ? void 0 : _b.symbol,
                poolName: (_c = position.pool) === null || _c === void 0 ? void 0 : _c.name,
                lockPeriodEnd: position.endDate,
                apr: (_d = position.pool) === null || _d === void 0 ? void 0 : _d.apr,
            };
        }));
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Staking positions retrieved successfully");
        return positionsWithComputedProps;
    }
    catch (error) {
        console.error("Error fetching staking positions:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch staking positions",
        });
    }
};
