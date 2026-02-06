"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Update Trading admin settings",
    operationId: "updateTradingAdminSettings",
    tags: ["Admin", "Trading"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Settings"),
    requiresAuth: true,
    permission: "access.trading.settings",
};
function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key]);
        }
        else {
            result[key] = source[key];
        }
    }
    return result;
}
exports.default = async (data) => {
    const { body } = data;
    const [settings, created] = await db_1.models.settings.findOrCreate({
        where: { key: "trading_pro" },
        defaults: {
            key: "trading_pro",
            value: JSON.stringify(body),
        },
    });
    if (!created) {
        let existingSettings = {};
        try {
            existingSettings = JSON.parse(settings.value || "{}");
        }
        catch (_a) {
            existingSettings = {};
        }
        const mergedSettings = deepMerge(existingSettings, body);
        settings.value = JSON.stringify(mergedSettings);
        await settings.save();
    }
    if (body.chartProvider) {
        await db_1.models.settings.upsert({
            key: "trading_pro_chart_provider",
            value: body.chartProvider,
        });
    }
    const cacheManager = cache_1.CacheManager.getInstance();
    await cacheManager.clearCache();
    return {
        success: true,
        settings: JSON.parse(settings.value || "{}"),
    };
};
