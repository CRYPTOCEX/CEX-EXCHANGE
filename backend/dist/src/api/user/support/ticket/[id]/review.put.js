"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Set satisfaction rating for a ticket",
    description: "Allows the ticket owner to submit a satisfaction rating (1-5)",
    operationId: "reviewTicket",
    tags: ["Support"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Review support ticket",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "The UUID of the ticket to review",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "The satisfaction rating",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        satisfaction: { type: "number" },
                    },
                    required: ["satisfaction"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Support Ticket"),
};
exports.default = async (data) => {
    const { params, user, body, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)(401, "Unauthorized");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding support ticket");
    const ticket = await db_1.models.supportTicket.findOne({
        where: { id, userId: user.id },
    });
    if (!ticket) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Ticket not found");
        throw (0, error_1.createError)(404, "Ticket not found");
    }
    if (ticket.satisfaction) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Satisfaction already set");
        throw (0, error_1.createError)(400, "Satisfaction already set");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating satisfaction rating");
    const { satisfaction } = body;
    if (typeof satisfaction !== "number" ||
        satisfaction < 1 ||
        satisfaction > 5) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid satisfaction rating");
        throw (0, error_1.createError)(400, "Satisfaction must be between 1 and 5");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving satisfaction rating");
    ticket.satisfaction = satisfaction;
    await ticket.save();
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Satisfaction rating submitted");
    return {
        message: "Satisfaction submitted",
        data: ticket.get({ plain: true }),
    };
};
