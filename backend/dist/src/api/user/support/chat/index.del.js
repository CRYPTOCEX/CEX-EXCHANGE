"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const Websocket_1 = require("@b/handler/Websocket");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "End a live chat session",
    description: "Ends the live chat session and closes the ticket",
    operationId: "endLiveChat",
    tags: ["Support"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "End live chat",
    requestBody: {
        description: "Session to end",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        sessionId: { type: "string" },
                    },
                    required: ["sessionId"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Live Chat Session"),
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { sessionId } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding live chat session");
    const ticket = await db_1.models.supportTicket.findOne({
        where: {
            id: sessionId,
            userId: user.id,
            type: "LIVE",
        },
    });
    if (!ticket) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Live chat session not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Live chat session not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Closing chat session");
    ticket.status = "CLOSED";
    await ticket.save();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Broadcasting session end via WebSocket");
    try {
        await (0, Websocket_1.handleBroadcastMessage)({
            type: "support-ticket",
            method: "update",
            id: sessionId,
            data: ticket.get({ plain: true }),
            route: "/api/user/support/ticket",
        });
    }
    catch (error) {
        console_1.logger.error("SUPPORT", "Failed to broadcast session end", error);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Chat session ended successfully");
    return { success: true, message: "Chat session ended successfully" };
};
