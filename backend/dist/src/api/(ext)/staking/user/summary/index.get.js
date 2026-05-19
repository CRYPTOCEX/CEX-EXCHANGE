"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get User's Staking Summary",
    description: "Retrieves a summary of the user's staking activity across all positions.",
    operationId: "getUserStakingSummary",
    tags: ["Staking", "User", "Summary"],
    requiresAuth: true,
    parameters: [],
    responses: {
        200: {
            description: "Summary retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            summary: {
                                type: "object",
                                properties: {
                                    totalStaked: { type: "number" },
                                    totalEarnings: { type: "number" },
                                    unclaimedEarnings: { type: "number" },
                                    activePositions: { type: "number" },
                                    byToken: {
                                        type: "array",
                                        items: {
                                            type: "object",
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
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user staking summary");
    const positions = await db_1.models.stakingPosition.findAll({
        where: {
            userId: user.id,
            status: "ACTIVE",
        },
        include: [
            {
                model: db_1.models.stakingPool,
                as: "pool",
                attributes: ["id", "name", "symbol", "icon"],
            },
        ],
    });
    const totalStaked = positions.reduce((sum, position) => sum + position.amount, 0);
    const positionIds = positions.map((p) => p.id);
    const allPositions = await db_1.models.stakingPosition.findAll({
        where: { userId: user.id },
        attributes: ["id"],
    });
    const allPositionIds = allPositions.map((p) => p.id);
    const earningsResult = await db_1.models.stakingEarningRecord.findAll({
        attributes: [
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN isClaimed = false THEN amount ELSE 0 END")),
                "unclaimed",
            ],
        ],
        where: {
            positionId: { [sequelize_1.Op.in]: allPositionIds },
        },
        raw: true,
    });
    const earningsData = earningsResult[0];
    const totalEarnings = (earningsData === null || earningsData === void 0 ? void 0 : earningsData.total) || 0;
    const unclaimedEarnings = (earningsData === null || earningsData === void 0 ? void 0 : earningsData.unclaimed) || 0;
    const tokenSummary = {};
    positions.forEach((position) => {
        const pool = position.pool;
        if (!pool)
            return;
        const tokenSymbol = pool.symbol;
        if (!tokenSummary[tokenSymbol]) {
            tokenSummary[tokenSymbol] = {
                tokenSymbol,
                tokenIcon: pool.icon,
                totalStaked: 0,
                positionCount: 0,
            };
        }
        tokenSummary[tokenSymbol].totalStaked += position.amount;
        tokenSummary[tokenSymbol].positionCount += 1;
    });
    const earningsByToken = await db_1.models.stakingEarningRecord.findAll({
        attributes: [
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "total"],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN isClaimed = false THEN amount ELSE 0 END")),
                "unclaimed",
            ],
        ],
        include: [
            {
                model: db_1.models.stakingPosition,
                as: "position",
                attributes: ["id", "poolId"],
                include: [
                    {
                        model: db_1.models.stakingPool,
                        as: "pool",
                        attributes: ["id", "symbol"],
                    },
                ],
            },
        ],
        where: {
            positionId: { [sequelize_1.Op.in]: allPositionIds },
        },
        group: [
            "position.pool.id",
            "position.pool.symbol",
        ],
        raw: false,
    });
    earningsByToken.forEach((earning) => {
        const position = earning.position;
        const pool = position === null || position === void 0 ? void 0 : position.pool;
        if (!pool)
            return;
        const tokenSymbol = pool.symbol;
        if (!tokenSummary[tokenSymbol]) {
            tokenSummary[tokenSymbol] = {
                tokenSymbol,
                tokenIcon: null,
                totalStaked: 0,
                positionCount: 0,
            };
        }
        tokenSummary[tokenSymbol].totalEarnings =
            Number.parseFloat(String(earning.getDataValue("total"))) || 0;
        tokenSummary[tokenSymbol].unclaimedEarnings =
            Number.parseFloat(String(earning.getDataValue("unclaimed"))) || 0;
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("User staking summary retrieved successfully");
    return {
        summary: {
            totalStaked,
            totalEarnings,
            unclaimedEarnings,
            activePositions: positions.length,
            byToken: Object.values(tokenSummary),
        },
    };
};
