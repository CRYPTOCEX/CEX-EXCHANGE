"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = handler;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const chart_1 = require("@b/utils/chart");
async function getScyllaChartData(params) {
    try {
        const module = await Promise.resolve().then(() => __importStar(require("@b/api/(ext)/ecosystem/utils/scylla/chart")));
        return module.getChartData(params);
    }
    catch (error) {
        throw (0, error_1.createError)(400, "Scylla extension is not installed or available");
    }
}
exports.metadata = {
    summary: "Gets chart data for user analytics (all in POST body)",
    operationId: "getAnalyticsData",
    tags: ["Admin", "CRM", "User", "Analytics"],
    logModule: "ADMIN_SYS",
    logTitle: "Run analysis",
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
    requiresAuth: true,
    permission: "access.admin",
};
async function handler(data) {
    const { body, ctx } = data;
    const { model, modelConfig, db = "mysql", keyspace: providedKeyspace, timeframe, charts, kpis, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating analysis request");
    if (!model) {
        throw (0, error_1.createError)(400, "Missing model parameter");
    }
    const additionalFilter = modelConfig || {};
    if (db === "mysql") {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing MySQL analytics");
        if (!db_1.models[model]) {
            console.error(`Model '${model}' not found. Available models:`, Object.keys(db_1.models));
            throw (0, error_1.createError)(400, `Invalid or missing model: ${model}`);
        }
        const result = await (0, chart_1.getChartData)({
            model: db_1.models[model],
            timeframe,
            charts,
            kpis,
            where: additionalFilter,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success();
        return result;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing Scylla analytics");
    if (!providedKeyspace)
        throw (0, error_1.createError)(400, "Missing keyspace parameter");
    const keyspace = providedKeyspace === "ecosystem"
        ? process.env.SCYLLA_KEYSPACE || "trading"
        : process.env.SCYLLA_FUTURES_KEYSPACE || "futures";
    const result = await getScyllaChartData({
        model,
        keyspace,
        timeframe,
        charts,
        kpis,
        where: additionalFilter,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
}
