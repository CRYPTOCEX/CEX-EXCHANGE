"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = handler;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const chart_1 = require("@b/utils/chart");
exports.metadata = {
    summary: "Gets chart data for user analytics (all in POST body)",
    operationId: "getAnalyticsData",
    tags: ["User", "CRM", "User", "Analytics"],
    logModule: "USER",
    logTitle: "Get analytics data",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        model: { type: "string" },
                        timeframe: { type: "string" },
                        db: { type: "string" },
                        keyspace: { type: "string", nullable: true },
                        charts: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    title: { type: "string" },
                                    type: {
                                        type: "string",
                                        enum: ["line", "bar", "pie", "stackedBar", "stackedArea"],
                                    },
                                    model: { type: "string" },
                                    metrics: {
                                        type: "array",
                                        items: { type: "string" },
                                    },
                                },
                            },
                        },
                        kpis: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    title: { type: "string" },
                                    metric: { type: "string" },
                                    model: { type: "string" },
                                    icon: { type: "string" },
                                },
                            },
                        },
                        modelConfig: {
                            type: "object",
                        },
                    },
                    required: ["model", "timeframe", "charts", "kpis"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Analytics data object matching your shape (kpis + chart keys)",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            kpis: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        title: { type: "string" },
                                        value: { type: "number" },
                                        change: { type: "number" },
                                        trend: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    date: { type: "string" },
                                                    value: { type: "number" },
                                                },
                                            },
                                        },
                                        icon: { type: "string" },
                                    },
                                },
                            },
                        },
                        additionalProperties: true,
                    },
                },
            },
        },
        401: { description: "Unauthorized access" },
    },
    requiresAuth: true,
};
async function handler(data) {
    const { user, body, ctx } = data;
    if (!user) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)(401, "Unauthorized access");
    }
    const { model, modelConfig, timeframe, charts, kpis } = body;
    if (!model) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Model parameter missing");
        throw (0, error_1.createError)(400, "Missing model parameter");
    }
    const additionalFilter = { userId: user.id, ...(modelConfig || {}) };
    if (!db_1.models[model]) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid model specified");
        throw (0, error_1.createError)(400, "Invalid or missing model");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Retrieving analytics data for model: ${model}`);
    const result = await (0, chart_1.getChartData)({
        model: db_1.models[model],
        timeframe,
        charts,
        kpis,
        where: additionalFilter,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Analytics data retrieved successfully");
    return result;
}
