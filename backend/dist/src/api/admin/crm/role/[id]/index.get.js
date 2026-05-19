"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const utils_1 = require("../utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Retrieves a specific role by ID",
    operationId: "getRole",
    tags: ["Admin", "CRM", "Role"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the role to retrieve",
            required: true,
            schema: {
                type: "number",
            },
        },
    ],
    permission: "view.role",
    responses: {
        200: {
            description: "Role retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseRoleSchema,
                    },
                },
            },
        },
        404: {
            description: "Role not found",
        },
        500: {
            description: "Internal server error",
        },
    },
    requiresAuth: true,
    logModule: "ADMIN_CRM",
    logTitle: "Get Role",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching role");
    const role = await db_1.models.role.findOne({
        where: {
            id: params.id,
        },
        include: [
            {
                model: db_1.models.permission,
                as: "permissions",
                through: { attributes: [] },
                attributes: ["id", "name"],
            },
        ],
    });
    if (!role) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Role not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Role retrieved successfully");
    return role.get({ plain: true });
};
