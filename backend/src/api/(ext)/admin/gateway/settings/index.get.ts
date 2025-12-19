import { models } from "@b/db";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

// Gateway settings keys
const GATEWAY_SETTINGS_KEYS = [
  "gatewayEnabled",
  "gatewayTestMode",
  // Fee settings (in USD, will be converted)
  "gatewayFeePercentage",
  "gatewayFeeFixed",
  // Limits (in USD, will be converted)
  "gatewayMinPaymentAmount",
  "gatewayMaxPaymentAmount",
  "gatewayDailyLimit",
  "gatewayMonthlyLimit",
  // Payout settings
  "gatewayMinPayoutAmount",
  "gatewayPayoutSchedule",
  // Allowed wallet types and currencies (JSON)
  "gatewayAllowedWalletTypes",
  // Security
  "gatewayRequireKyc",
  "gatewayAutoApproveVerified",
  // Payment session
  "gatewayPaymentExpirationMinutes",
  // Webhooks
  "gatewayWebhookRetryAttempts",
  "gatewayWebhookRetryDelaySeconds",
];

export const metadata = {
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
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.gateway.settings",
  logModule: "ADMIN_GATEWAY",
  logTitle: "Get gateway settings",
};

export default async (data: Handler) => {
  const { ctx } = data;

  ctx?.step("Fetching gateway settings");

  const settings = await models.settings.findAll({
    where: {
      key: GATEWAY_SETTINGS_KEYS,
    },
  });

  ctx?.step("Parsing settings values");

  // Convert to key-value object with parsed values
  const settingsMap: Record<string, any> = {};
  for (const setting of settings) {
    let parsedValue = setting.value;
    // Try to parse JSON values
    if (setting.value) {
      try {
        parsedValue = JSON.parse(setting.value);
      } catch {
        // Keep as string if not valid JSON
      }
    }
    settingsMap[setting.key] = parsedValue;
  }

  ctx?.success(`Retrieved ${settings.length} gateway settings`);

  return settingsMap;
};
