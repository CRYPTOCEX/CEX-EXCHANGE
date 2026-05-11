"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const GATEWAY_SETTINGS_KEYS = [
    "gatewayEnabled",
    "gatewayFeePercentage",
    "gatewayFeeFixed",
    "gatewayMinPaymentAmount",
    "gatewayMaxPaymentAmount",
    "gatewayAllowedWalletTypes",
    "gatewayPaymentExpirationMinutes",
];
exports.metadata = {
    summary: "Get gateway settings",
    description: "Gets public gateway settings for merchants.",
    operationId: "getGatewaySettings",
    tags: ["Gateway", "Settings"],
    responses: {
        200: {
            description: "Gateway settings",
        },
    },
    requiresAuth: false,
    logModule: "GATEWAY",
    logTitle: "Get Gateway Settings",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching gateway settings");
    const settings = await db_1.models.settings.findAll({
        where: {
            key: GATEWAY_SETTINGS_KEYS,
        },
    });
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
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return settingsMap;
};
