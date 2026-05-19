"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Lists all roles with pagination and optional filtering",
    operationId: "listRoles",
    tags: ["Admin", "CRM", "Role"],
    responses: {
        200: {
            description: "Paginated list of roles with detailed permission associations",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.baseRoleSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Roles"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.role",
    logModule: "ADMIN_CRM",
    logTitle: "Get Role Options",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching role options");
    const roles = await db_1.models.role.findAll({
        where: {
            name: {
                [sequelize_1.Op.ne]: "Super Admin",
            },
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Role options retrieved successfully");
    return roles;
};
