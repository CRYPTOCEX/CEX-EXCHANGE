"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Clear settings cache",
    description: "Clears the Redis cache and reloads all settings from the database",
    operationId: "clearSettingsCache",
    tags: ["Admin", "Settings", "Cache"],
    requiresAuth: true,
    permission: "edit.settings",
    responses: {
        200: {
            description: "Cache cleared successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            message: { type: "string" },
                            settingsCount: { type: "number" },
                            extensionsCount: { type: "number" },
                        },
                    },
                },
            },
        },
        401: {
            description: "Unauthorized",
        },
        500: {
            description: "Internal server error",
        },
    },
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { ctx } = data;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Clearing settings cache");
        const cacheManager = cache_1.CacheManager.getInstance();
        await cacheManager.clearCache();
        const settings = await cacheManager.getSettings();
        const extensions = await cacheManager.getExtensions();
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Cache cleared. Loaded ${settings.size} settings, ${extensions.size} extensions`);
        return {
            success: true,
            message: "Cache cleared and reloaded from database",
            settingsCount: settings.size,
            extensionsCount: extensions.size,
        };
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
};
