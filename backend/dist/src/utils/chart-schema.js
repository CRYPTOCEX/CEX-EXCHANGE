"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANALYSIS_RESPONSE_SCHEMA = exports.ANALYSIS_BODY_PROPERTIES = exports.CHART_ITEM_SCHEMA = exports.KPI_ITEM_SCHEMA = void 0;
const AGG_FILTER = {
    type: "object",
    properties: {
        field: { type: "string" },
        value: {
            type: ["string", "number", "boolean", "object", "null"],
            properties: { column: { type: "string" }, ago: { type: "string" } },
        },
        values: { type: "array", items: { type: ["string", "null"] } },
        op: { type: "string", enum: ["=", "!=", "<", "<=", ">", ">="] },
        negate: { type: "boolean" },
    },
    required: ["field"],
};
const AGGREGATION = {
    type: "object",
    properties: {
        field: { type: "string" },
        value: { type: "string", nullable: true },
        op: {
            type: "string",
            enum: ["countWhere", "count", "sum", "avg", "min", "max", "countDistinct"],
        },
        aggregationType: {
            type: "string",
            enum: ["countWhere", "count", "sum", "avg", "min", "max", "countDistinct"],
        },
        where: { type: "array", items: AGG_FILTER },
        multiplyBy: { type: "string" },
        inUSD: { type: "string" },
        since: {
            type: "object",
            properties: {
                unit: { type: "string", enum: ["min", "h", "d", "w", "mo", "y"] },
                until: { type: "string" },
            },
        },
    },
};
const DERIVED = {
    type: "object",
    properties: {
        op: { type: "string", enum: ["ratio", "percent", "diff", "sum", "product"] },
        of: { type: "array", items: { type: "string" } },
        fallback: { type: "number" },
    },
    required: ["op", "of"],
};
exports.KPI_ITEM_SCHEMA = {
    type: "object",
    properties: {
        id: { type: "string" },
        title: { type: "string" },
        metric: { type: "string" },
        model: { type: "string" },
        icon: { type: "string" },
        aggregation: AGGREGATION,
        derived: DERIVED,
        valueMode: {
            type: "string",
            enum: ["periodTotal", "latestBucket", "current"],
        },
        format: {
            type: "string",
            enum: ["currency", "number", "percent", "compact", "duration"],
        },
        currency: { type: "string" },
        invert: { type: "boolean" },
    },
};
exports.CHART_ITEM_SCHEMA = {
    type: "object",
    properties: {
        id: { type: "string" },
        title: { type: "string" },
        type: {
            type: "string",
            enum: ["line", "bar", "pie", "stackedBar", "stackedArea"],
        },
        model: { type: "string" },
        metrics: { type: "array", items: { type: "string" } },
        timeframes: { type: "array", items: { type: "string" } },
        labels: { type: "object" },
        config: {
            type: "object",
            properties: {
                field: { type: "string" },
                groupBy: { type: "string" },
                limit: { type: "number" },
                measure: AGGREGATION,
                scope: { type: "string", enum: ["window", "all"] },
                labelField: { type: "string" },
                status: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            value: { type: "string", nullable: true },
                            label: { type: "string" },
                            color: { type: "string" },
                            icon: { type: "string" },
                        },
                    },
                },
            },
        },
    },
};
exports.ANALYSIS_BODY_PROPERTIES = {
    model: { type: "string" },
    timeframe: { type: "string" },
    timeframeMode: { type: "string", enum: ["rolling", "calendar"] },
    dateField: { type: "string" },
    db: { type: "string" },
    keyspace: { type: "string", nullable: true },
    charts: { type: "array", items: exports.CHART_ITEM_SCHEMA },
    kpis: { type: "array", items: exports.KPI_ITEM_SCHEMA },
    modelConfig: { type: "object" },
};
exports.ANALYSIS_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        kpis: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    value: { type: "number", nullable: true },
                    change: { type: "number", nullable: true },
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
                    format: { type: "string" },
                    currency: { type: "string" },
                    invert: { type: "boolean" },
                    valueMode: { type: "string" },
                    error: { type: "string" },
                },
            },
        },
        errors: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    message: { type: "string" },
                },
            },
        },
        meta: { type: "object" },
    },
    additionalProperties: true,
};
