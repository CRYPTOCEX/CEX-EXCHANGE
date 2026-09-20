"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const redis_1 = require("@b/utils/redis");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const redis = redis_1.RedisSingleton.getInstance();
exports.metadata = {
    summary: "Get chart cache settings",
    operationId: "getChartSettings",
    tags: ["Admin", "Exchange", "Chart"],
    responses: {
        200: {
            description: "Chart cache settings",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            cacheDays: { type: "number" },
                            rateLimit: { type: "number" },
                            intervals: { type: "array", items: { type: "string" } },
                            autoUpdate: { type: "boolean" },
                            exchangeBanStatus: {
                                type: "object",
                                properties: {
                                    isBanned: { type: "boolean" },
                                    unblockTime: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.exchange.chart",
};
const DEFAULT_INTERVALS = ["1m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "12h", "1d", "3d", "1w"];
exports.default = async (data) => {
    try {
        const settings = await db_1.models.settings.findOne({
            where: { key: "chart_cache" },
            raw: true,
        });
        let chartSettings = {
            cacheDays: 30,
            rateLimit: 500,
            intervals: DEFAULT_INTERVALS,
            autoUpdate: false,
        };
        if (settings === null || settings === void 0 ? void 0 : settings.value) {
            try {
                const parsed = JSON.parse(settings.value);
                chartSettings = { ...chartSettings, ...parsed };
            }
            catch (e) {
            }
        }
        let exchangeBanStatus = {
            isBanned: false,
            unblockTime: null,
            remainingSeconds: 0,
        };
        try {
            const banStatus = await redis.get("exchange:ban_status");
            if (banStatus) {
                const unblockTime = parseInt(banStatus, 10);
                const now = Date.now();
                if (unblockTime > now) {
                    exchangeBanStatus = {
                        isBanned: true,
                        unblockTime,
                        remainingSeconds: Math.ceil((unblockTime - now) / 1000),
                    };
                }
            }
        }
        catch (e) {
        }
        return {
            ...chartSettings,
            exchangeBanStatus,
        };
    }
    catch (error) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to get chart settings: ${error.message}` });
    }
};
