"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
exports.metadata = {
    summary: "Lists all permissions with pagination and optional filtering",
    operationId: "listPermissions",
    tags: ["Admin", "CRM", "Permission"],
    parameters: constants_1.crudParameters,
    logModule: "ADMIN_CRM",
    logTitle: "List permissions",
    responses: {
        200: {
            description: "Paginated list of permissions with details",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string", description: "ID of the permission" },
                                        name: {
                                            type: "string",
                                            description: "Name of the permission",
                                        },
                                        rolePermissions: {
                                            type: "array",
                                            description: "List of roles associated with the permission",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    roleId: {
                                                        type: "string",
                                                        description: "ID of the role",
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized, admin permission required" },
        500: { description: "Internal server error" },
    },
    requiresAuth: true,
    permission: "view.permission",
};
exports.default = async (data) => {
    const { query, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching permissions");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.permission,
        query,
        sortField: query.sortField || "name",
        includeModels: [
            {
                model: db_1.models.role,
                as: "roles",
                through: { attributes: [] },
            },
        ],
        timestamps: false,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Permissions retrieved successfully");
    return result;
};
