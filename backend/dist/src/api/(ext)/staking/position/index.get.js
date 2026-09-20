"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get User's Staking Positions",
    description: "Retrieves all staking positions for the authenticated user with pagination support.",
    operationId: "getUserStakingPositions",
    tags: ["Staking", "Positions"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "status",
            in: "query",
            required: false,
            schema: {
                type: "string",
                enum: ["ACTIVE", "LOCKED", "PENDING_WITHDRAWAL", "COMPLETED"],
            },
            description: "Filter by position status",
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
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "Page number for pagination",
        },
        {
            index: 3,
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            description: "Number of items per page",
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
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                },
                            },
                            pagination: {
                                type: "object",
                                properties: {
                                    page: { type: "integer" },
                                    limit: { type: "integer" },
                                    total: { type: "integer" },
                                    totalPages: { type: "integer" },
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
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user staking positions");
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const whereClause = { userId: user.id };
    if (query.status) {
        if (query.status === "LOCKED") {
            whereClause.status = "ACTIVE";
            whereClause.endDate = { [sequelize_1.Op.gt]: new Date() };
        }
        else {
            whereClause.status = query.status;
        }
    }
    if (query.poolId) {
        whereClause.poolId = query.poolId;
    }
    const totalCount = await db_1.models.stakingPosition.count({
        where: whereClause,
    });
    const positions = await db_1.models.stakingPosition.findAll({
        where: whereClause,
        include: [
            {
                model: db_1.models.stakingPool,
                as: "pool",
            },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });
    const enhancedPositions = await Promise.all(positions.map(async (position) => {
        const totalEarnings = await db_1.models.stakingEarningRecord.sum("amount", {
            where: { positionId: position.id },
        });
        const unclaimedEarnings = await db_1.models.stakingEarningRecord.sum("amount", {
            where: {
                positionId: position.id,
                isClaimed: false,
            },
        });
        let timeRemaining = null;
        if (position.status === "ACTIVE" &&
            position.endDate &&
            new Date(position.endDate) > new Date()) {
            const now = new Date();
            const endDate = new Date(position.endDate);
            timeRemaining = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
        return {
            ...position.toJSON(),
            earnings: {
                total: totalEarnings || 0,
                unclaimed: unclaimedEarnings || 0,
            },
            timeRemaining,
        };
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${enhancedPositions.length} staking positions`);
    return {
        data: enhancedPositions,
        pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
        },
    };
};
