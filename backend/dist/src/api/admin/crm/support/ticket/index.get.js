"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("./utils");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Lists support tickets with pagination and filtering",
    operationId: "listSupportTickets",
    tags: ["Admin", "CRM", "Support Ticket"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Support tickets retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.supportTicketSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Support Tickets"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.support.ticket",
    demoMask: ["items.user.email", "items.agent.email"],
};
exports.default = async (data) => {
    const { query, user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    try {
        const result = await (0, query_1.getFiltered)({
            model: db_1.models.supportTicket,
            query,
            sortField: query.sortField || "createdAt",
            where: { userId: { [sequelize_1.Op.ne]: user.id } },
            includeModels: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
                {
                    model: db_1.models.user,
                    as: "agent",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
            ],
        });
        if (result.items && Array.isArray(result.items)) {
            result.items = result.items.map((ticket) => {
                if (typeof ticket.messages === 'string') {
                    try {
                        ticket.messages = JSON.parse(ticket.messages);
                    }
                    catch (e) {
                        console_1.logger.warn("SUPPORT", "Failed to parse messages JSON");
                        ticket.messages = [];
                    }
                }
                if (typeof ticket.tags === 'string') {
                    try {
                        ticket.tags = JSON.parse(ticket.tags);
                    }
                    catch (e) {
                        console_1.logger.warn("SUPPORT", "Failed to parse tags JSON");
                        ticket.tags = [];
                    }
                }
                ticket.messages = ticket.messages || [];
                ticket.tags = ticket.tags || [];
                return ticket;
            });
        }
        return result;
    }
    catch (error) {
        console_1.logger.error("SUPPORT", "Error fetching support tickets", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch support tickets",
        });
    }
};
