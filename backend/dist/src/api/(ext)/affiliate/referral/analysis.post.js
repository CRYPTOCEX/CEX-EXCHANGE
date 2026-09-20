"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const chart_1 = require("@b/utils/chart");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Gets chart data for analytics",
    operationId: "getAnalyticsData",
    tags: ["User", "Analytics"],
    requiresAuth: true,
    logModule: "AFFILIATE",
    logTitle: "Get affiliate analytics data",
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
};
exports.default = async (data) => {
    const { user, query, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const { model, modelConfig, db = "mysql", keyspace: providedKeyspace, timeframe, charts, kpis, } = body;
    const { availableFilters } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating analytics request for model: ${model}`);
    if (!["mlmReferral", "mlmReferralReward"].includes(model))
        throw (0, error_1.createError)(400, "Invalid model");
    if (!db_1.models[model])
        throw (0, error_1.createError)(400, "Invalid model");
    if (!model) {
        throw (0, error_1.createError)(400, "Missing model parameter");
    }
    const additionalFilter = modelConfig || {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Generating chart data for ${(charts === null || charts === void 0 ? void 0 : charts.length) || 0} charts and ${(kpis === null || kpis === void 0 ? void 0 : kpis.length) || 0} KPIs`);
    if (db === "mysql") {
        if (!db_1.models[model]) {
            throw (0, error_1.createError)(400, "Invalid or missing model");
        }
        const result = await (0, chart_1.getChartData)({
            model: db_1.models[model],
            timeframe,
            charts,
            kpis,
            where: additionalFilter,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Generated analytics data for ${model} with timeframe: ${timeframe}`);
        return result;
    }
};
