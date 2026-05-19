"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.getTicket = getTicket;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Retrieves a single ticket details for the logged-in user",
    description: "Fetches detailed information about a specific support ticket identified by its ID, including associated chat details.",
    operationId: "getTicket",
    tags: ["Support"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Get support ticket",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "The ID of the ticket to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Ticket details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "boolean",
                                description: "Indicates if the request was successful",
                            },
                            statusCode: {
                                type: "number",
                                description: "HTTP status code",
                                example: 200,
                            },
                            data: {
                                type: "object",
                                properties: {
                                    id: {
                                        type: "string",
                                        description: "ID of the ticket",
                                    },
                                    userId: {
                                        type: "string",
                                        description: "ID of the user who created the ticket",
                                    },
                                    agentId: {
                                        type: "string",
                                        description: "ID of the agent assigned to the ticket",
                                    },
                                    subject: {
                                        type: "string",
                                        description: "Subject of the ticket",
                                    },
                                    importance: {
                                        type: "string",
                                        description: "Importance level of the ticket",
                                    },
                                    status: {
                                        type: "string",
                                        description: "Status of the ticket",
                                    },
                                    messages: {
                                        type: "array",
                                        description: "Messages associated with the ticket",
                                    },
                                    createdAt: {
                                        type: "string",
                                        format: "date-time",
                                        description: "Date and time the ticket was created",
                                    },
                                    updatedAt: {
                                        type: "string",
                                        format: "date-time",
                                        description: "Date and time the ticket was updated",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Support Ticket"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _a === void 0 ? void 0 : _a.call(ctx, "User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Retrieving support ticket");
    const result = await getTicket(user.id, params.id, ctx);
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "Support ticket retrieved successfully");
    return result;
};
async function getTicket(userId, id, ctx) {
    var _a, _b, _c, _d, _e, _f;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Querying database for support ticket");
        const ticket = await db_1.models.supportTicket.findOne({
            where: { id, userId },
            include: [
                {
                    model: db_1.models.user,
                    as: "agent",
                    attributes: ["avatar", "firstName", "lastName", "lastLogin"],
                },
            ],
        });
        if (!ticket) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, "Ticket not found");
            throw (0, error_1.createError)({
                message: "Ticket not found",
                statusCode: 404,
            });
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Processing ticket data");
        const plainTicket = ticket.get({ plain: true });
        if (typeof plainTicket.messages === 'string') {
            try {
                plainTicket.messages = JSON.parse(plainTicket.messages);
            }
            catch (e) {
                console_1.logger.warn("SUPPORT", "Failed to parse messages JSON");
                plainTicket.messages = [];
            }
        }
        if (typeof plainTicket.tags === 'string') {
            try {
                plainTicket.tags = JSON.parse(plainTicket.tags);
            }
            catch (e) {
                console_1.logger.warn("SUPPORT", "Failed to parse tags JSON");
                plainTicket.tags = [];
            }
        }
        plainTicket.messages = plainTicket.messages || [];
        plainTicket.tags = plainTicket.tags || [];
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, "Ticket data processed successfully");
        return plainTicket;
    }
    catch (error) {
        if (error.statusCode) {
            (_e = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _e === void 0 ? void 0 : _e.call(ctx, error.message);
            throw error;
        }
        console_1.logger.error("SUPPORT", "Error fetching ticket", error);
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, "Failed to fetch ticket");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch ticket",
        });
    }
}
