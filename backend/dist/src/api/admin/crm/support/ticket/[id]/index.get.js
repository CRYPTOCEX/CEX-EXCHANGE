"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Retrieves a specific support ticket by ID, including stats",
    operationId: "getSupportTicketById",
    tags: ["Admin", "CRM", "Support Ticket"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the support ticket to retrieve",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Support ticket details, with user and agent stats",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...utils_1.supportTicketSchema,
                            userStats: {
                                type: "object",
                                properties: {
                                    totalTickets: { type: "number" },
                                    resolvedTickets: { type: "number" },
                                },
                            },
                            agentStats: {
                                type: "object",
                                properties: {
                                    avgRating: { type: "number", nullable: true },
                                    resolved: { type: "number" },
                                },
                                nullable: true,
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Support ticket not found"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.support.ticket",
    logModule: "ADMIN_CRM",
    logTitle: "Get Support Ticket",
    demoMask: ["user.email", "agent.email"],
};
exports.default = async (data) => {
    var _a;
    const { params, ctx } = data;
    try {
        if (!(params === null || params === void 0 ? void 0 : params.id) || typeof params.id !== 'string') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid ticket ID format",
            });
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(params.id)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid ticket ID format",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching support ticket");
        let ticket;
        try {
            ticket = await db_1.models.supportTicket.findOne({
                where: { id: params.id },
                include: [
                    {
                        model: db_1.models.user,
                        as: "agent",
                        attributes: ["id", "avatar", "firstName", "lastName", "lastLogin"],
                    },
                    {
                        model: db_1.models.user,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "email", "avatar"],
                    },
                ],
            });
        }
        catch (dbError) {
            console_1.logger.error("TICKET", `Database error fetching ticket ${params.id}`, dbError);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Database connection error",
            });
        }
        if (!ticket) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Support ticket not found",
            });
        }
        let plainTicket;
        try {
            plainTicket = ticket.get({ plain: true });
        }
        catch (jsonError) {
            console_1.logger.error("TICKET", "Error extracting ticket data", jsonError);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to process ticket data",
            });
        }
        if (typeof plainTicket.messages === 'string') {
            try {
                const parsed = JSON.parse(plainTicket.messages);
                plainTicket.messages = Array.isArray(parsed) ? parsed : [];
            }
            catch (e) {
                console_1.logger.error("TICKET", `Failed to parse messages JSON for ticket ${plainTicket.id}`, e);
                console_1.logger.debug("TICKET", `Problematic messages value: ${plainTicket.messages}`);
                plainTicket.messages = [];
            }
        }
        if (typeof plainTicket.tags === 'string') {
            try {
                const parsed = JSON.parse(plainTicket.tags);
                plainTicket.tags = Array.isArray(parsed) ? parsed : [];
            }
            catch (e) {
                console_1.logger.error("TICKET", `Failed to parse tags JSON for ticket ${plainTicket.id}`, e);
                console_1.logger.debug("TICKET", `Problematic tags value: ${plainTicket.tags}`);
                plainTicket.tags = [];
            }
        }
        plainTicket.messages = plainTicket.messages || [];
        plainTicket.tags = plainTicket.tags || [];
        const userId = plainTicket.userId;
        let userStats = { totalTickets: 0, resolvedTickets: 0 };
        if (userId) {
            try {
                const [totalTickets, resolvedTickets] = await Promise.all([
                    db_1.models.supportTicket.count({ where: { userId } }),
                    db_1.models.supportTicket.count({ where: { userId, status: "CLOSED" } }),
                ]);
                userStats = { totalTickets, resolvedTickets };
            }
            catch (statsError) {
                console_1.logger.error("TICKET", "Error fetching user stats", statsError);
                userStats = { totalTickets: 0, resolvedTickets: 0 };
            }
        }
        let agentStats = null;
        const agentId = plainTicket.agentId;
        if (agentId) {
            try {
                const [resolved, ratingResult] = await Promise.all([
                    db_1.models.supportTicket.count({ where: { agentId, status: "CLOSED" } }),
                    db_1.models.supportTicket.findAll({
                        where: {
                            agentId,
                            satisfaction: { [sequelize_1.Op.not]: null },
                        },
                        attributes: [[(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("satisfaction")), "avgRating"]],
                        raw: true,
                    }),
                ]);
                agentStats = {
                    resolved,
                    avgRating: ((_a = ratingResult[0]) === null || _a === void 0 ? void 0 : _a.avgRating)
                        ? parseFloat(ratingResult[0].avgRating)
                        : null,
                };
            }
            catch (agentStatsError) {
                console_1.logger.error("TICKET", "Error fetching agent stats", agentStatsError);
                agentStats = { avgRating: null, resolved: 0 };
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Support ticket retrieved successfully");
        return {
            ...plainTicket,
            userStats,
            agentStats,
        };
    }
    catch (error) {
        console_1.logger.error("TICKET", "Error fetching support ticket", error);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal server error",
        });
    }
};
