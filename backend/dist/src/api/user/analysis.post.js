"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = handler;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const chart_1 = require("@b/utils/chart");
const chart_schema_1 = require("@b/utils/chart-schema");
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
                    properties: { ...chart_schema_1.ANALYSIS_BODY_PROPERTIES },
                    required: ["model", "timeframe", "charts", "kpis"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Analytics data object matching your shape (kpis + chart keys)",
            content: {
                "application/json": { schema: chart_schema_1.ANALYSIS_RESPONSE_SCHEMA },
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
    const { model, modelConfig, timeframe, timeframeMode, dateField, charts, kpis } = body;
    if (!model) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Model parameter missing");
        throw (0, error_1.createError)(400, "Missing model parameter");
    }
    const registry = db_1.models;
    const target = typeof model === "string" &&
        Object.prototype.hasOwnProperty.call(registry, model)
        ? registry[model]
        : undefined;
    if (!target || typeof target.getAttributes !== "function") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Unknown model: ${model}`);
        throw (0, error_1.createError)(400, "Invalid or missing model");
    }
    if (!target.getAttributes().userId) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Model '${model}' is not scoped to a user`);
        throw (0, error_1.createError)(400, `Model '${model}' has no user-owned rows`);
    }
    const { userId: _ignoredUserId, ...safeConfig } = modelConfig || {};
    const additionalFilter = { ...safeConfig, userId: user.id };
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Retrieving analytics data for model: ${model}`);
    const result = await (0, chart_1.getChartData)({
        model: target,
        timeframe,
        timeframeMode,
        dateField,
        charts,
        kpis,
        where: additionalFilter,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Analytics data retrieved successfully");
    return result;
}
