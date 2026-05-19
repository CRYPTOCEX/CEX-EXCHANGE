"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Lists Staking Positions with computed rewards and earning details",
    operationId: "listStakingPositions",
    tags: ["Staking", "Admin", "Positions"],
    parameters: [
        ...constants_1.crudParameters,
        {
            index: constants_1.crudParameters.length,
            name: "poolId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter positions by pool ID",
        },
        {
            index: constants_1.crudParameters.length + 1,
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
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Staking Positions"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Get Pool Positions",
    permission: "view.staking.position",
    demoMask: ["items.user.email"],
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
    if (!user) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Operation completed successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.stakingPosition,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "email", "firstName", "lastName", "avatar"],
            },
            {
                model: db_1.models.stakingPool,
                as: "pool",
                attributes: ["id", "name", "symbol", "apr"],
            },
            {
                model: db_1.models.stakingEarningRecord,
                as: "earningHistory",
                required: false,
            },
        ],
        compute: [
            [
                (0, sequelize_1.literal)(`(
          SELECT COALESCE(SUM(ser.amount), 0)
          FROM staking_earning_records AS ser
          WHERE ser.positionId = stakingPosition.id
            AND ser.isClaimed = false
        )`),
                "pendingRewards",
            ],
            [
                (0, sequelize_1.literal)(`(
          SELECT COALESCE(SUM(ser.amount), 0)
          FROM staking_earning_records AS ser
          WHERE ser.positionId = stakingPosition.id
        )`),
                "earningsToDate",
            ],
            [
                (0, sequelize_1.literal)(`(
          SELECT MAX(ser.createdAt)
          FROM staking_earning_records AS ser
          WHERE ser.positionId = stakingPosition.id
        )`),
                "lastEarningDate",
            ],
        ],
    });
};
