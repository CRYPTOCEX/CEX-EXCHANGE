"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const adminAuditLogSchema = {
    id: { type: "string", format: "uuid" },
    userId: { type: "string", format: "uuid", nullable: true },
    module: { type: "string" },
    title: { type: "string" },
    method: { type: "string" },
    path: { type: "string" },
    targetId: { type: "string", nullable: true },
    status: { type: "string", enum: ["SUCCESS", "ERROR"] },
    reason: { type: "string", nullable: true },
    error: { type: "string", nullable: true },
    durationMs: { type: "number", nullable: true },
    requestId: { type: "string", nullable: true },
    ip: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" },
};
exports.metadata = {
    summary: "Lists admin audit log entries with pagination and filtering",
    operationId: "listAdminAuditLog",
    tags: ["Admin", "System"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of admin audit entries with pagination information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: { type: "object", properties: adminAuditLogSchema },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Admin audit log"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.admin.audit",
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.adminAuditLog,
        query,
        sortField: query.sortField || "createdAt",
        paranoid: false,
        timestamps: false,
        includeModels: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
                required: false,
            },
        ],
    });
};
