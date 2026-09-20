"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const rules_1 = require("./rules");
exports.metadata = {
    summary: "List Price Alerts",
    operationId: "listPriceAlerts",
    tags: ["Exchange", "Alerts"],
    description: "Every price alert belonging to the authenticated user, newest first. " +
        "Includes triggered and expired alerts so a client can show what fired " +
        "while the browser was closed.",
    logModule: "EXCHANGE",
    logTitle: "List Price Alerts",
    parameters: [
        {
            name: "symbol",
            in: "query",
            required: false,
            description: "Only alerts on this symbol",
            schema: { type: "string" },
        },
        {
            name: "status",
            in: "query",
            required: false,
            description: "Only alerts in this state",
            schema: {
                type: "string",
                enum: ["ACTIVE", "TRIGGERED", "EXPIRED", "DISABLED"],
            },
        },
    ],
    responses: {
        200: {
            description: "The user's price alerts",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: { type: "object", properties: utils_1.baseAlertSchema },
                            },
                            maxAlerts: { type: "number" },
                            activeCount: { type: "number" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const where = { userId: user.id };
    if (query === null || query === void 0 ? void 0 : query.symbol)
        where.symbol = String(query.symbol).toUpperCase();
    if (query === null || query === void 0 ? void 0 : query.status)
        where.status = String(query.status).toUpperCase();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching price alerts");
    const rows = await db_1.models.exchangePriceAlert.findAll({
        where,
        order: [["createdAt", "DESC"]],
        limit: 200,
    });
    const items = rows.map(utils_1.serializeAlert);
    const activeCount = items.filter((a) => a.status === "ACTIVE").length;
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${items.length} price alerts`);
    return { items, maxAlerts: rules_1.MAX_ALERTS_PER_USER, activeCount };
};
