"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Lists Staking Pools with associated positions, admin earnings, and performances",
    operationId: "listStakingPools",
    tags: ["Staking", "Admin", "Pools"],
    parameters: constants_1.crudParameters,
    responses: {
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Staking Pools"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Get Staking Pools",
    permission: "view.staking.pool",
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
    if (!user) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Operation completed successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.stakingPool,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.stakingPosition,
                as: "positions",
                required: false,
            },
            {
                model: db_1.models.stakingAdminEarning,
                as: "adminEarnings",
                required: false,
            },
            {
                model: db_1.models.stakingExternalPoolPerformance,
                as: "performances",
                required: false,
            },
        ],
        compute: [
            [
                (0, sequelize_1.literal)(`(
          SELECT COALESCE(SUM(sp.amount), 0)
          FROM staking_positions AS sp
          WHERE sp.poolId = stakingPool.id
        )`),
                "totalStaked",
            ],
        ],
    });
};
