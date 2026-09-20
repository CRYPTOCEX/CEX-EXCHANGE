"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const broadcast_1 = require("@b/utils/support/broadcast");
const ai_hook_1 = require("@b/utils/support/ai-hook");
const query_1 = require("@b/utils/query");
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
    (0, broadcast_1.broadcastSupportUpdate)(sessionId, { status: "CLOSED" });
    (0, ai_hook_1.notifyTicketClosed)(sessionId);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Chat session ended successfully");
    return { success: true, message: "Chat session ended successfully" };
};
