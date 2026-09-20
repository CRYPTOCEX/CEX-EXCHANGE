"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const cache_1 = require("@b/utils/cache");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
const geo_1 = require("@b/utils/geo");
const SERVER_ONLY_SETTING_KEYS = new Set([
    geo_1.GEO_SETTING_KEYS.lookupApiKey,
    "captchaSecretKey",
    "poolBackingEngineState",
    "poolBackingAttributedThrough",
    "poolBackingVenueFeesThrough",
].map((key) => key.toLowerCase()));
exports.metadata = {
    summary: "Retrieves the application settings",
    description: "This endpoint retrieves the application settings.",
    operationId: "getSettings",
    tags: ["Settings"],
    requiresAuth: false,
    responses: {
        200: {
            description: "Application settings retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                key: {
                                    type: "string",
                                    description: "Setting key",
                                },
                                value: {
                                    type: "string",
                                    description: "Setting value",
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Settings"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async () => {
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        const settings = Array.from((await cacheManager.getSettings()).entries())
            .filter(([key]) => !SERVER_ONLY_SETTING_KEYS.has(key.toLowerCase()))
            .map(([key, value]) => ({ key, value }));
        const extensions = Array.from((await cacheManager.getExtensions()).keys());
        return {
            settings,
            extensions,
        };
    }
    catch (error) {
        console_1.logger.error("SETTINGS", "Error fetching settings and extensions", error);
        return query_1.serverErrorResponse;
    }
};
