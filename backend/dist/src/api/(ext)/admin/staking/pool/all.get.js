"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Staking Pools",
    description: "Retrieves all staking pools with optional filtering by status, search term, APR range, and token.",
    operationId: "getStakingPools",
    tags: ["Staking", "Admin", "Pools"],
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Get All Staking Pools",
    parameters: [
        {
            index: 0,
            name: "status",
            in: "query",
            required: false,
            schema: {
                type: "string",
                enum: ["ACTIVE", "INACTIVE", "COMING_SOON"],
            },
            description: "Filter pools by status",
        },
        {
            index: 1,
            name: "search",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Search term to filter pools by name, token, or symbol",
        },
        {
            index: 2,
            name: "minApr",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Minimum APR value",
        },
        {
            index: 3,
            name: "maxApr",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Maximum APR value",
        },
        {
            index: 4,
            name: "token",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter pools by token",
        },
    ],
    responses: {
        200: {
            description: "Pools retrieved successfully",
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
    permission: "view.staking.pool",
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
        const where = {};
        if (query === null || query === void 0 ? void 0 : query.status) {
            where.status = query.status;
        }
        if (query === null || query === void 0 ? void 0 : query.search) {
            const searchTerm = `%${query.search}%`;
            where[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.like]: searchTerm } },
                { token: { [sequelize_1.Op.like]: searchTerm } },
                { symbol: { [sequelize_1.Op.like]: searchTerm } },
            ];
        }
        if ((query === null || query === void 0 ? void 0 : query.minApr) !== undefined) {
            where.apr = {
                ...where.apr,
                [sequelize_1.Op.gte]: Number.parseFloat(query.minApr),
            };
        }
        if ((query === null || query === void 0 ? void 0 : query.maxApr) !== undefined) {
            where.apr = {
                ...where.apr,
                [sequelize_1.Op.lte]: Number.parseFloat(query.maxApr),
            };
        }
        if (query === null || query === void 0 ? void 0 : query.token) {
            where.token = query.token;
        }
        const pools = await db_1.models.stakingPool.findAll({
            where,
            attributes: {
                include: [
                    [
                        (0, sequelize_1.literal)(`(
              SELECT COALESCE(SUM(sp.amount), 0)
              FROM staking_positions AS sp
              WHERE sp.poolId = stakingPool.id
            )`),
                        "totalStaked",
                    ],
                ],
            },
            include: [
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
            order: [["order", "ASC"]],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Operation completed successfully");
        return pools;
    }
    catch (error) {
        console.error("Error fetching staking pools:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch staking pools",
        });
    }
};
