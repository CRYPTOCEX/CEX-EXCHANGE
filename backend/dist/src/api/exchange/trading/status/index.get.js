"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Check Trading status",
    operationId: "getTradingStatus",
    tags: ["Trading"],
    responses: {
        200: {
            description: "Trading status",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            enabled: { type: "boolean" },
                            chartProvider: {
                                type: "string",
                                enum: ["tradingview", "chart_engine"],
                            },
                        },
                    },
                },
            },
        },
        500: query_1.serverErrorResponse,
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    const chartSetting = await db_1.models.settings.findOne({
        where: { key: "trading_pro_chart_provider" },
    });
    return {
        enabled: true,
        chartProvider: (chartSetting === null || chartSetting === void 0 ? void 0 : chartSetting.value) || "tradingview",
    };
};
