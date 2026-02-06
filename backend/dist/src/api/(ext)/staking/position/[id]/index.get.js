"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Staking Position Details",
    description: "Retrieves detailed information about a specific staking position.",
    operationId: "getStakingPositionById",
    tags: ["Staking", "Positions"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Position ID",
        },
    ],
    responses: {
        200: {
            description: "Position details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            position: { type: "object" },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Not position owner" },
        404: { description: "Position not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching staking position ${id}`);
    const position = await db_1.models.stakingPosition.findOne({
        where: { id },
        include: [
            {
                model: db_1.models.stakingPool,
                as: "pool",
                attributes: ["id", "name", "symbol", "icon", "apr", "lockPeriod", "walletType", "walletChain"],
            },
        ],
    });
    if (!position) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Position not found" });
    }
    if (position.userId !== user.id) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "You don't have access to this position",
        });
    }
    const earnings = await db_1.models.stakingEarningRecord.findAll({
        where: { positionId: position.id },
        order: [["createdAt", "DESC"]],
    });
    const totalEarnings = earnings.reduce((sum, record) => sum + record.amount, 0);
    const unclaimedEarnings = earnings
        .filter((record) => !record.isClaimed)
        .reduce((sum, record) => sum + record.amount, 0);
    let timeRemaining = null;
    const positionData = position;
    if (positionData.endDate) {
        const now = new Date();
        const endDate = new Date(positionData.endDate);
        timeRemaining = Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }
    const enhancedPosition = {
        ...position.toJSON(),
        earnings: {
            records: earnings,
            total: totalEarnings,
            unclaimed: unclaimedEarnings,
        },
        timeRemaining,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Staking position ${id} retrieved successfully`);
    return { position: enhancedPosition };
};
