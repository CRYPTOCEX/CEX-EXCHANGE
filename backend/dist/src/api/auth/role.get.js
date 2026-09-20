"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Retrieves all roles",
    operationId: "getRoles",
    tags: ["Auth"],
    description: "Retrieves all roles",
    requiresAuth: false,
    responses: {
        200: {
            description: "Roles retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string", description: "ID of the role" },
                                name: { type: "string", description: "Name of the role" },
                                permissions: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: {
                                                type: "string",
                                                description: "ID of the permission",
                                            },
                                            name: {
                                                type: "string",
                                                description: "Name of the permission",
                                            },
                                        },
                                        required: ["id", "name"],
                                    },
                                },
                            },
                            required: ["id", "name", "permissions"],
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Role"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async () => {
    const roles = await db_1.models.role.findAll({
        include: [
            {
                model: db_1.models.permission,
                as: "permissions",
                through: { attributes: [] },
                attributes: ["id", "name"],
            },
        ],
    });
    return roles.map((role) => role.get({ plain: true }));
};
