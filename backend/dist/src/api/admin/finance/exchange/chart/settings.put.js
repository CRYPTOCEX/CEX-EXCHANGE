"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Update chart cache settings",
    operationId: "updateChartSettings",
    tags: ["Admin", "Exchange", "Chart"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        cacheDays: {
                            type: "number",
                            description: "Number of days to cache chart data",
                            minimum: 1,
                            maximum: 365,
                        },
                        rateLimit: {
                            type: "number",
                            description: "Delay in milliseconds between API requests",
                            minimum: 100,
                            maximum: 10000,
                        },
                        intervals: {
                            type: "array",
                            items: { type: "string" },
                            description: "Intervals to cache",
                        },
                        autoUpdate: {
                            type: "boolean",
                            description: "Enable automatic chart data updates",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Settings updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "manage.exchange.chart",
};
const VALID_INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w"];
exports.default = async (data) => {
    const { body } = data;
    const { cacheDays, rateLimit, intervals, autoUpdate } = body;
    if (intervals) {
        const invalidIntervals = intervals.filter((i) => !VALID_INTERVALS.includes(i));
        if (invalidIntervals.length > 0) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Invalid intervals: ${invalidIntervals.join(", ")}` });
        }
    }
    let existingSettings = {};
    const settings = await db_1.models.settings.findOne({
        where: { key: "chart_cache" },
    });
    if (settings === null || settings === void 0 ? void 0 : settings.value) {
        try {
            existingSettings = JSON.parse(settings.value);
        }
        catch (e) {
        }
    }
    const newSettings = {
        ...existingSettings,
        ...(cacheDays !== undefined && { cacheDays }),
        ...(rateLimit !== undefined && { rateLimit }),
        ...(intervals !== undefined && { intervals }),
        ...(autoUpdate !== undefined && { autoUpdate }),
    };
    if (settings) {
        await settings.update({ value: JSON.stringify(newSettings) });
    }
    else {
        await db_1.models.settings.create({
            key: "chart_cache",
            value: JSON.stringify(newSettings),
        });
    }
    return {
        message: "Chart settings updated successfully",
        settings: newSettings,
    };
};
