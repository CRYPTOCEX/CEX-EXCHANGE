import { models } from "@b/db";
import { CacheManager } from "@b/utils/cache";
import {
  unauthorizedResponse,
  badRequestResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

// Allowed gateway settings keys
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
    400: badRequestResponse,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.gateway.settings",
  logModule: "ADMIN_GATEWAY",
  logTitle: "Update gateway settings",
};

export default async (data: Handler) => {
  const { body, ctx } = data;

  ctx?.step("Validating and processing settings");

  const updates: string[] = [];

  for (const [key, value] of Object.entries(body)) {
    // Only allow gateway-prefixed settings
    if (!key.startsWith("gateway") || !GATEWAY_SETTINGS_KEYS.includes(key)) {
      continue;
    }

    ctx?.step(`Updating setting: ${key}`);

    const stringValue =
      typeof value === "object" ? JSON.stringify(value) : String(value);

    const existingSetting = await models.settings.findOne({
      where: { key },
    });

    if (existingSetting) {
      await existingSetting.update({ value: stringValue });
    } else {
      await models.settings.create({
        key,
        value: stringValue,
      });
    }

    updates.push(key);
  }

  ctx?.step("Clearing cache");

  // Clear cache
  const cacheManager = CacheManager.getInstance();
  await cacheManager.clearCache();

  ctx?.success(`Updated ${updates.length} gateway settings`);

  return {
    message: "Settings updated successfully",
    updatedKeys: updates,
  };
};
