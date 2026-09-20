"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Counters for the signed-in user's support tickets",
    description: "Status counts, average first-response time and average satisfaction across ALL of the caller's tickets — not just the page currently on screen.",
    operationId: "getUserSupportTicketStats",
    tags: ["Support"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Get support ticket stats",
    responses: {
        200: {
            description: "Ticket counters",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            total: { type: "number" },
                            open: { type: "number" },
                            pending: { type: "number" },
                            replied: { type: "number" },
                            closed: { type: "number" },
                            awaitingUs: { type: "number" },
                            avgResponseTime: { type: "number", nullable: true },
                            satisfaction: { type: "number", nullable: true },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Counting support tickets");
    const scope = (extra) => ({
        userId: user.id,
        ...extra,
    });
    const [total, open, pending, replied, closed, avgResponse, avgSatisfaction] = await Promise.all([
        db_1.models.supportTicket.count({ where: scope() }),
        db_1.models.supportTicket.count({ where: scope({ status: "OPEN" }) }),
        db_1.models.supportTicket.count({ where: scope({ status: "PENDING" }) }),
        db_1.models.supportTicket.count({ where: scope({ status: "REPLIED" }) }),
        db_1.models.supportTicket.count({ where: scope({ status: "CLOSED" }) }),
        db_1.models.supportTicket.findOne({
            attributes: [[(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("responseTime")), "avgResponseTime"]],
            where: scope({ responseTime: { [sequelize_1.Op.not]: null } }),
            raw: true,
        }),
        db_1.models.supportTicket.findOne({
            attributes: [[(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("satisfaction")), "avgSatisfaction"]],
            where: scope({ satisfaction: { [sequelize_1.Op.not]: null } }),
            raw: true,
        }),
    ]);
    const avgResponseTime = (avgResponse === null || avgResponse === void 0 ? void 0 : avgResponse.avgResponseTime) === null ||
        (avgResponse === null || avgResponse === void 0 ? void 0 : avgResponse.avgResponseTime) === undefined
        ? null
        : Math.round(Number(avgResponse.avgResponseTime));
    const satisfaction = (avgSatisfaction === null || avgSatisfaction === void 0 ? void 0 : avgSatisfaction.avgSatisfaction) === null ||
        (avgSatisfaction === null || avgSatisfaction === void 0 ? void 0 : avgSatisfaction.avgSatisfaction) === undefined
        ? null
        : Number(Number(avgSatisfaction.avgSatisfaction).toFixed(2));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Support ticket counters retrieved");
    return {
        total,
        open,
        pending,
        replied,
        closed,
        awaitingUs: open + pending,
        avgResponseTime,
        satisfaction,
    };
};
