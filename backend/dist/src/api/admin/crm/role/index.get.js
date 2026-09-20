"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Lists all roles with pagination and optional filtering",
    operationId: "listRoles",
    tags: ["Admin", "CRM", "Role"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Paginated list of roles with detailed permission associations",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.baseRoleSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
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
    permission: "view.role",
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.role,
        query,
        sortField: query.sortField || "name",
        includeModels: [
            {
                model: db_1.models.permission,
                as: "permissions",
                through: { attributes: [] },
                attributes: ["id", "name"],
            },
        ],
        timestamps: false,
        excludeRecords: [
            {
                key: "name",
                value: "Super Admin",
            },
        ],
    });
};
