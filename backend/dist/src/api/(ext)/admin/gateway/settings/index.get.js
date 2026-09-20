"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
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
    summary: "Get gateway settings",
    description: "Retrieves all payment gateway configuration settings including fee structure, payment limits, payout settings, allowed wallet types, security options, and webhook configuration.",
    operationId: "getGatewaySettings",
    tags: ["Admin", "Gateway", "Settings"],
    responses: {
        200: {
            description: "Gateway settings as key-value pairs",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        additionalProperties: true,
                        description: "Settings object with parsed JSON values",
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.gateway.settings",
    logModule: "ADMIN_GATEWAY",
    logTitle: "Get gateway settings",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching gateway settings");
    const settings = await db_1.models.settings.findAll({
        where: {
            key: GATEWAY_SETTINGS_KEYS,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing settings values");
    const settingsMap = {};
    for (const setting of settings) {
        let parsedValue = setting.value;
        if (setting.value) {
            try {
                parsedValue = JSON.parse(setting.value);
            }
            catch (_a) {
            }
        }
        settingsMap[setting.key] = parsedValue;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${settings.length} gateway settings`);
    return settingsMap;
};
