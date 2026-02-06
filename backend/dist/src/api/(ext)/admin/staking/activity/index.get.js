"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Admin Activities",
    description: "Retrieves all admin activities with optional filtering by action, type, and search term (e.g. admin name or related ID).",
    operationId: "getAdminActivities",
    tags: ["Staking", "Admin", "Activities"],
    requiresAuth: true,
    logModule: "ADMIN_STAKE",
    logTitle: "Get Staking Activities",
    parameters: [
        {
            index: 0,
            name: "action",
            in: "query",
            required: false,
            schema: {
                type: "string",
                enum: ["create", "update", "delete", "approve", "reject", "distribute"],
            },
            description: "Filter activities by action type",
        },
        {
            index: 1,
            name: "type",
            in: "query",
            required: false,
            schema: {
                type: "string",
                enum: ["pool", "position", "earnings", "settings", "withdrawal"],
            },
            description: "Filter activities by activity type",
        },
        {
            index: 2,
            name: "search",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Search term to filter activities by relatedId or admin details (first name, last name, email)",
        },
    ],
    responses: {
        200: {
            description: "Admin activities retrieved successfully",
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
    permission: "view.staking.activity",
    demoMask: ["user.email"],
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
        const where = {};
        if (query === null || query === void 0 ? void 0 : query.action) {
            where.action = query.action;
        }
        if (query === null || query === void 0 ? void 0 : query.type) {
            where.type = query.type;
        }
        let userWhere = undefined;
        if (query === null || query === void 0 ? void 0 : query.search) {
            const searchTerm = `%${query.search}%`;
            userWhere = {
                [sequelize_1.Op.or]: [
                    { firstName: { [sequelize_1.Op.like]: searchTerm } },
                    { lastName: { [sequelize_1.Op.like]: searchTerm } },
                    { email: { [sequelize_1.Op.like]: searchTerm } },
                ],
            };
            where[sequelize_1.Op.or] = [{ relatedId: { [sequelize_1.Op.like]: searchTerm } }];
        }
        const activities = await db_1.models.stakingAdminActivity.findAll({
            where,
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    required: false,
                    ...(userWhere ? { where: userWhere } : {}),
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
            ],
            order: [["createdAt", "DESC"]],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Operation completed successfully");
        return activities;
    }
    catch (error) {
        console.error("Error fetching admin activities:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch admin activities",
        });
    }
};
