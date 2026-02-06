"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("./utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Lists all tickets for the logged-in user",
    operationId: "listTickets",
    tags: ["Support"],
    description: "Fetches all support tickets associated with the currently authenticated user.",
    logModule: "USER",
    logTitle: "List support tickets",
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "Posts retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.baseSupportTicketSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Support Ticket"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a;
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving support tickets");
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.supportTicket,
        query,
        sortField: query.sortField || "createdAt",
        where: { userId: user.id },
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
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${((_a = result.items) === null || _a === void 0 ? void 0 : _a.length) || 0} support tickets`);
    return result;
};
