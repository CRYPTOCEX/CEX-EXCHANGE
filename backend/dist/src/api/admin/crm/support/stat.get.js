"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const scope_1 = require("./scope");
exports.metadata = {
    summary: "Support Ticket Dashboard Analytics",
    description: "Returns admin analytics for support tickets (counts, averages, etc).",
    operationId: "adminSupportTicketStats",
    tags: ["Admin", "CRM", "Support Ticket"],
    requiresAuth: true,
    permission: "view.support.ticket",
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
                            avgResponseTime: { type: "number", nullable: true },
                            satisfaction: { type: "number", nullable: true },
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
    const scope = (0, scope_1.supportQueueScope)();
    const scoped = (extra) => ({ ...scope, ...extra });
    const [total, open, pending, closed, unassigned, avgResponse, avgSatisfaction,] = await Promise.all([
        db_1.models.supportTicket.count({ where: scoped() }),
        db_1.models.supportTicket.count({ where: scoped({ status: "OPEN" }) }),
        db_1.models.supportTicket.count({ where: scoped({ status: "PENDING" }) }),
        db_1.models.supportTicket.count({ where: scoped({ status: "CLOSED" }) }),
        db_1.models.supportTicket.count({
            where: scoped({ agentId: null, status: { [sequelize_1.Op.ne]: "CLOSED" } }),
        }),
        db_1.models.supportTicket.findOne({
            attributes: [[(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("responseTime")), "avgResponseTime"]],
            where: scoped({ responseTime: { [sequelize_1.Op.not]: null } }),
            raw: true,
        }),
        db_1.models.supportTicket.findOne({
            attributes: [[(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("satisfaction")), "avgSatisfaction"]],
            where: scoped({ satisfaction: { [sequelize_1.Op.not]: null } }),
            raw: true,
        }),
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Support ticket statistics retrieved successfully");
    const avgResponseTime = (avgResponse === null || avgResponse === void 0 ? void 0 : avgResponse.avgResponseTime) === null ||
        (avgResponse === null || avgResponse === void 0 ? void 0 : avgResponse.avgResponseTime) === undefined
        ? null
        : Math.round(Number(avgResponse.avgResponseTime));
    const satisfaction = (avgSatisfaction === null || avgSatisfaction === void 0 ? void 0 : avgSatisfaction.avgSatisfaction) === null ||
        (avgSatisfaction === null || avgSatisfaction === void 0 ? void 0 : avgSatisfaction.avgSatisfaction) === undefined
        ? null
        : Number(Number(avgSatisfaction.avgSatisfaction).toFixed(2));
    return {
        total,
        open,
        pending,
        closed,
        unassigned,
        avgResponseTime,
        satisfaction,
    };
};
