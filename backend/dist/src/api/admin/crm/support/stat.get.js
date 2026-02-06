"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Support Ticket Dashboard Analytics",
    description: "Returns admin analytics for support tickets (counts, averages, etc).",
    operationId: "adminSupportTicketStats",
    tags: ["Admin", "CRM", "Support Ticket"],
    requiresAuth: true,
    permission: "access.support.ticket",
    responses: {
        200: {
            description: "Support ticket analytics",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            total: { type: "number" },
                            open: { type: "number" },
                            pending: { type: "number" },
                            closed: { type: "number" },
                            unassigned: { type: "number" },
                            avgResponseTime: { type: "number" },
                            satisfaction: { type: "number" },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Server error" },
    },
    logModule: "ADMIN_CRM",
    logTitle: "Get Support Ticket Stats",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching support ticket statistics");
    const [total, open, pending, closed, unassigned, avgResponse, avgSatisfaction,] = await Promise.all([
        db_1.models.supportTicket.count(),
        db_1.models.supportTicket.count({ where: { status: "OPEN" } }),
        db_1.models.supportTicket.count({ where: { status: "PENDING" } }),
        db_1.models.supportTicket.count({ where: { status: "CLOSED" } }),
        db_1.models.supportTicket.count({ where: { agentId: null } }),
        db_1.models.supportTicket.findOne({
            attributes: [[(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("responseTime")), "avgResponseTime"]],
            where: { responseTime: { [sequelize_1.Op.gt]: 0 } },
            raw: true,
        }),
        db_1.models.supportTicket.findOne({
            attributes: [[(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("satisfaction")), "avgSatisfaction"]],
            where: { satisfaction: { [sequelize_1.Op.not]: null } },
            raw: true,
        }),
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Support ticket statistics retrieved successfully");
    return {
        total,
        open,
        pending,
        closed,
        unassigned,
        avgResponseTime: (avgResponse === null || avgResponse === void 0 ? void 0 : avgResponse.avgResponseTime)
            ? Math.round(Number(avgResponse.avgResponseTime))
            : 0,
        satisfaction: (avgSatisfaction === null || avgSatisfaction === void 0 ? void 0 : avgSatisfaction.avgSatisfaction)
            ? Number(avgSatisfaction.avgSatisfaction).toFixed(2)
            : 0,
    };
};
