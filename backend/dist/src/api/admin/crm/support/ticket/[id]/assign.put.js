"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Assigns or unassigns an agent to a support ticket",
    operationId: "assignSupportTicketAgent",
    tags: ["Admin", "CRM", "Support Ticket"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the support ticket",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        agentId: {
                            type: "string",
                            nullable: true,
                            description: "ID of the agent to assign, or null to unassign",
                        },
                    },
                    required: ["agentId"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Agent assigned/unassigned successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    agentId: { type: "string", nullable: true },
                                    agentName: { type: "string", nullable: true },
                                },
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
    permission: "edit.support.ticket",
    logModule: "ADMIN_SUP",
    logTitle: "Assign agent to ticket",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    const { agentId } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching ticket");
        const ticket = await db_1.models.supportTicket.findOne({
            where: { id: params.id },
        });
        if (!ticket) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Ticket not found");
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Support ticket not found",
            });
        }
        let agentName = null;
        if (agentId) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying agent");
            const agent = await db_1.models.user.findOne({
                where: { id: agentId },
                attributes: ["id", "firstName", "lastName"],
            });
            if (!agent) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Agent not found");
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: "Agent not found",
                });
            }
            agentName = `${agent.firstName} ${agent.lastName}`.trim();
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating ticket assignment");
        await ticket.update({
            agentId: agentId || null,
            agentName: agentName,
            status: agentId ? "OPEN" : "PENDING",
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(agentId ? "Agent assigned successfully" : "Agent unassigned successfully");
        return {
            message: agentId ? "Agent assigned successfully" : "Agent unassigned successfully",
            data: {
                id: ticket.id,
                agentId: agentId || null,
                agentName: agentName,
            },
        };
    }
    catch (error) {
        console_1.logger.error("SUPPORT", "Error assigning agent to ticket", error);
        if (error.statusCode) {
            throw error;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Internal server error");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal server error",
        });
    }
};
