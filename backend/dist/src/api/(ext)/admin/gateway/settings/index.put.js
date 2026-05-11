"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const cache_1 = require("@b/utils/cache");
const errors_1 = require("@b/utils/schema/errors");
const GATEWAY_SETTINGS_KEYS = [
    "gatewayEnabled",
    "gatewayTestMode",
    "gatewayFeePercentage",
    "gatewayFeeFixed",
    "gatewayMinPaymentAmount",
    "gatewayMaxPaymentAmount",
    "gatewayDailyLimit",
    "gatewayMonthlyLimit",
    "gatewayMinPayoutAmount",
    "gatewayPayoutSchedule",
    "gatewayAllowedWalletTypes",
    "gatewayRequireKyc",
    "gatewayAutoApproveVerified",
    "gatewayPaymentExpirationMinutes",
    "gatewayWebhookRetryAttempts",
    "gatewayWebhookRetryDelaySeconds",
];
exports.metadata = {
    summary: "Update gateway settings",
    description: "Updates payment gateway configuration settings. Only gateway-prefixed settings from the allowed list can be updated. Automatically clears cache after update to ensure new settings take effect immediately.",
    operationId: "updateGatewaySettings",
    tags: ["Admin", "Gateway", "Settings"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    additionalProperties: true,
                    description: "Settings to update (key-value pairs, only gateway-prefixed keys allowed)",
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
                            message: { type: "string" },
                            updatedKeys: {
                                type: "array",
                                items: { type: "string" },
                                description: "List of setting keys that were updated",
                            },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.gateway.settings",
    logModule: "ADMIN_GATEWAY",
    logTitle: "Update gateway settings",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating and processing settings");
    const updates = [];
    for (const [key, value] of Object.entries(body)) {
        if (!key.startsWith("gateway") || !GATEWAY_SETTINGS_KEYS.includes(key)) {
            continue;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating setting: ${key}`);
        const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
        const existingSetting = await db_1.models.settings.findOne({
            where: { key },
        });
        if (existingSetting) {
            await existingSetting.update({ value: stringValue });
        }
        else {
            await db_1.models.settings.create({
                key,
                value: stringValue,
            });
        }
        updates.push(key);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Clearing cache");
    const cacheManager = cache_1.CacheManager.getInstance();
    await cacheManager.clearCache();
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Updated ${updates.length} gateway settings`);
    return {
        message: "Settings updated successfully",
        updatedKeys: updates,
    };
};
