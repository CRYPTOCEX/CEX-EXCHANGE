"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const announcementSchema = {
    id: { type: "string", format: "uuid" },
    type: { type: "string", enum: ["GENERAL", "EVENT", "UPDATE"] },
    title: { type: "string" },
    message: { type: "string" },
    link: { type: "string", nullable: true },
    status: { type: "boolean", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    deletedAt: { type: "string", format: "date-time", nullable: true },
};
exports.metadata = {
    summary: "Lists all Announcements with pagination and optional filtering",
    operationId: "listAnnouncements",
    tags: ["Admin", "Announcements"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of Announcements with pagination information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: announcementSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Announcements"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.announcement",
};
exports.default = async (data) => {
    const { query } = data;
    return (0, query_1.getFiltered)({
        model: db_1.models.announcement,
        query,
        sortField: query.sortField || "createdAt",
    });
};
