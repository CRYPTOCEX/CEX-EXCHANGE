"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const stats_calculator_1 = require("@b/api/(ext)/copy-trading/utils/stats-calculator");
exports.metadata = {
    summary: "List All Copy Trading Leaders (Admin)",
    description: "Retrieves all copy trading leaders with filtering options.",
    operationId: "adminListCopyTradingLeaders",
    tags: ["Admin", "Copy Trading"],
    requiresAuth: true,
    logModule: "ADMIN_COPY",
    logTitle: "Get Copy Trading Leaders",
    permission: "access.copy_trading",
    demoMask: ["items.user.email"],
    parameters: [
        {
            name: "status",
            in: "query",
            schema: { type: "string" },
            description: "Filter by status (comma-separated)",
        },
        {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search by display name or email",
        },
        {
            name: "page",
            in: "query",
            schema: { type: "number" },
        },
        {
            name: "limit",
            in: "query",
            schema: { type: "number" },
        },
    ],
    responses: {
        200: { description: "Leaders retrieved successfully" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Copy Trading Leaders");
    const whereClause = {};
    const userWhereClause = {};
    if (query.status) {
        const statuses = query.status.split(",");
        whereClause.status = { [sequelize_1.Op.in]: statuses };
    }
    if (query.search) {
        const searchTerm = `%${query.search}%`;
        whereClause[sequelize_1.Op.or] = [{ displayName: { [sequelize_1.Op.like]: searchTerm } }];
        userWhereClause[sequelize_1.Op.or] = [
            { email: { [sequelize_1.Op.like]: searchTerm } },
            { firstName: { [sequelize_1.Op.like]: searchTerm } },
            { lastName: { [sequelize_1.Op.like]: searchTerm } },
        ];
    }
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const { count, rows: leaders } = await db_1.models.copyTradingLeader.findAndCountAll({
        where: whereClause,
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
                where: query.search ? userWhereClause : undefined,
                required: query.search ? true : false,
            },
            {
                model: db_1.models.copyTradingLeaderMarket,
                as: "markets",
                required: false,
            },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating stats for leaders");
    const leaderIds = leaders.map((l) => l.id);
    const statsMap = await (0, stats_calculator_1.calculateBatchLeaderStats)(leaderIds);
    const leadersWithStats = leaders.map((l) => {
        const leaderData = l.toJSON();
        const stats = statsMap.get(l.id);
        return {
            ...leaderData,
            ...stats,
        };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Copy Trading Leaders retrieved successfully");
    return {
        items: leadersWithStats,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    };
};
