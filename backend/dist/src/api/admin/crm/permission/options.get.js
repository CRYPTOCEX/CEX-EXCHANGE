"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Lists all permissions",
    operationId: "listPermissions",
    tags: ["Admin", "CRM", "Permission"],
    logModule: "ADMIN_CRM",
    logTitle: "Get permission options",
    responses: {
        200: {
            description: "List of permissions",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string", description: "ID of the permission" },
                                name: {
                                    type: "string",
                                    description: "Name of the permission",
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Permissions"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching permission options");
    const result = await db_1.models.permission.findAll({
        order: [['name', 'ASC']]
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Permission options retrieved successfully");
    return result;
};
