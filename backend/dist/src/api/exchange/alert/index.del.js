"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Clear Finished Price Alerts",
    operationId: "clearFinishedPriceAlerts",
    tags: ["Exchange", "Alerts"],
    description: "Deletes the authenticated user's TRIGGERED and EXPIRED alerts. Active " +
        "and paused alerts are left alone — this is the panel's Clear button, not " +
        "a way to disarm everything by accident.",
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        symbol: {
                            type: "string",
                            description: "Only clear finished alerts on this symbol",
                        },
                    },
                },
            },
        },
    },
    responses: (0, query_1.deleteRecordResponses)("Price Alerts"),
    requiresAuth: true,
    logModule: "EXCHANGE",
    logTitle: "Clear Finished Price Alerts",
};
exports.default = async (data) => {
    var _a;
    const { user, body, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const symbol = ((_a = body === null || body === void 0 ? void 0 : body.symbol) !== null && _a !== void 0 ? _a : query === null || query === void 0 ? void 0 : query.symbol);
    const where = {
        userId: user.id,
        status: { [sequelize_1.Op.in]: ["TRIGGERED", "EXPIRED"] },
    };
    if (symbol)
        where.symbol = String(symbol).toUpperCase();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Clearing finished alerts");
    const removed = await db_1.models.exchangePriceAlert.destroy({ where });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Cleared ${removed} finished alert(s)`);
    return { message: `Cleared ${removed} alert(s)`, removed };
};
