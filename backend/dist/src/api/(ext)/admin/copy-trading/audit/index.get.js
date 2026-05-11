"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get Copy Trading Audit Logs",
    description: "Retrieves audit logs for copy trading with filtering and pagination. Supports filtering by entity type, entity ID, action, user ID, admin ID, and date range. Returns audit logs with associated user and admin information, plus action type counts for filtering.",
    operationId: "getAdminCopyTradingAuditLogs",
    tags: ["Admin", "Copy Trading", "Audit"],
    requiresAuth: true,
    logModule: "ADMIN_COPY",
    logTitle: "Get Copy Trading Audit",
    permission: "access.copy_trading",
    demoMask: ["items.user.email", "items.admin.email"],
    parameters: [
        {
            name: "entityType",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["LEADER", "FOLLOWER", "TRADE", "TRANSACTION", "SETTING"] },
            description: "Filter by entity type",
        },
        {
            name: "entityId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter by entity ID",
        },
        {
            name: "action",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter by action type",
        },
        {
            name: "userId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter by affected user ID",
        },
        {
            name: "adminId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter by admin who performed action",
        },
        {
            name: "dateFrom",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Filter from date",
        },
        {
            name: "dateTo",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Filter until date",
        },
        {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", default: 1 },
        },
        {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", default: 20 },
        },
    ],
    responses: {
        200: {
            description: "Audit logs retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                description: "List of audit logs",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        entityType: { type: "string" },
                                        entityId: { type: "string" },
                                        action: { type: "string" },
                                        oldValue: { type: "object" },
                                        newValue: { type: "object" },
                                        metadata: { type: "object" },
                                        userId: { type: "string" },
                                        adminId: { type: "string" },
                                        createdAt: { type: "string", format: "date-time" },
                                        user: { type: "object" },
                                        admin: { type: "object" },
                                    },
                                },
                            },
                            pagination: {
                                type: "object",
                                properties: {
                                    total: { type: "integer" },
                                    page: { type: "integer" },
                                    limit: { type: "integer" },
                                    totalPages: { type: "integer" },
                                },
                            },
                            filters: {
                                type: "object",
                                properties: {
                                    actions: {
                                        type: "array",
                                        description: "Available action types with counts",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        403: errors_1.forbiddenResponse,
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const where = {};
    if (query.entityType) {
        where.entityType = query.entityType;
    }
    if (query.entityId) {
        where.entityId = query.entityId;
    }
    if (query.action) {
        where.action = query.action;
    }
    if (query.userId) {
        where.userId = query.userId;
    }
    if (query.adminId) {
        where.adminId = query.adminId;
    }
    if (query.dateFrom || query.dateTo) {
        where.createdAt = {};
        if (query.dateFrom) {
            where.createdAt[sequelize_1.Op.gte] = new Date(query.dateFrom);
        }
        if (query.dateTo) {
            where.createdAt[sequelize_1.Op.lte] = new Date(query.dateTo + "T23:59:59.999Z");
        }
    }
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const { count, rows: logs } = await db_1.models.copyTradingAuditLog.findAndCountAll({
        where,
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
                required: false,
            },
            {
                model: db_1.models.user,
                as: "admin",
                attributes: ["id", "firstName", "lastName", "email"],
                required: false,
            },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching audit logs");
    const actionCounts = await db_1.models.copyTradingAuditLog.findAll({
        attributes: [
            "action",
            [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
        ],
        group: ["action"],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Audit logs retrieved successfully");
    return {
        items: logs.map((log) => {
            const item = log.toJSON();
            try {
                if (item.oldValue)
                    item.oldValue = JSON.parse(item.oldValue);
                if (item.newValue)
                    item.newValue = JSON.parse(item.newValue);
                if (item.metadata)
                    item.metadata = JSON.parse(item.metadata);
            }
            catch (_a) { }
            return item;
        }),
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
        filters: {
            actions: actionCounts.map((a) => ({
                action: a.action,
                count: parseInt(a.get("count")),
            })),
        },
    };
};
