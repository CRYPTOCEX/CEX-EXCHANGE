"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "List all P2P disputes",
    operationId: "listAdminP2PDisputes",
    tags: ["Admin", "P2P", "Dispute"],
    description: "Retrieves a paginated list of all P2P disputes with detailed information including trade details, involved users, and dispute status. Supports filtering, sorting, and pagination.",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Paginated list of P2P disputes retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                description: "Array of P2P dispute objects",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string", format: "uuid", description: "Dispute ID" },
                                        tradeId: { type: "string", format: "uuid", description: "Associated trade ID" },
                                        amount: { type: "string", description: "Disputed amount" },
                                        reportedById: { type: "string", format: "uuid", description: "User who reported the dispute" },
                                        againstId: { type: "string", format: "uuid", description: "User against whom dispute was filed" },
                                        reason: { type: "string", description: "Reason for dispute" },
                                        details: { type: "string", nullable: true, description: "Additional dispute details" },
                                        filedOn: { type: "string", format: "date-time", description: "When dispute was filed" },
                                        status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "RESOLVED"], description: "Dispute status" },
                                        priority: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"], description: "Dispute priority" },
                                        resolution: { type: "object", nullable: true, description: "Resolution details if resolved" },
                                        resolvedOn: { type: "string", format: "date-time", nullable: true, description: "When dispute was resolved" },
                                        messages: { type: "array", description: "Dispute messages" },
                                        evidence: { type: "array", description: "Submitted evidence" },
                                        activityLog: { type: "array", description: "Activity log entries" },
                                        trade: {
                                            type: "object",
                                            description: "Associated trade details",
                                            properties: {
                                                id: { type: "string" },
                                                status: { type: "string" },
                                                amount: { type: "number" },
                                                currency: { type: "string" },
                                            },
                                        },
                                        reportedBy: {
                                            type: "object",
                                            description: "User who reported",
                                            properties: {
                                                id: { type: "string" },
                                                firstName: { type: "string" },
                                                lastName: { type: "string" },
                                                email: { type: "string" },
                                                avatar: { type: "string", nullable: true },
                                            },
                                        },
                                        against: {
                                            type: "object",
                                            description: "User against whom dispute was filed",
                                            properties: {
                                                id: { type: "string" },
                                                firstName: { type: "string" },
                                                lastName: { type: "string" },
                                                email: { type: "string" },
                                                avatar: { type: "string", nullable: true },
                                            },
                                        },
                                        createdAt: { type: "string", format: "date-time" },
                                        updatedAt: { type: "string", format: "date-time" },
                                    },
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                        required: ["items", "pagination"],
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("P2P Disputes"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "ADMIN_P2P",
    logTitle: "Get P2P Disputes",
    permission: "view.p2p.dispute",
    demoMask: ["items.reportedBy.email", "items.against.email"],
};
exports.default = async (data) => {
    const { query, user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Operation completed successfully");
    return (0, query_1.getFiltered)({
        model: db_1.models.p2pDispute,
        query,
        sortField: query.sortField || "filedOn",
        where: {},
        includeModels: [
            {
                model: db_1.models.p2pTrade,
                as: "trade",
                attributes: ["id", "status", "amount", "currency"],
            },
            {
                model: db_1.models.user,
                as: "reportedBy",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
                required: false,
            },
            {
                model: db_1.models.user,
                as: "against",
                attributes: ["id", "firstName", "lastName", "email", "avatar"],
                required: false,
            },
        ],
    });
};
