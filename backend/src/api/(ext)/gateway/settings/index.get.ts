import { models } from "@b/db";

// Gateway settings keys that merchants can see
const GATEWAY_SETTINGS_KEYS = [
  "gatewayEnabled",
  // Fee settings
  "gatewayFeePercentage",
  "gatewayFeeFixed",
  // Limits
  "gatewayMinPaymentAmount",
  "gatewayMaxPaymentAmount",
  // Allowed wallet types and currencies (JSON)
  "gatewayAllowedWalletTypes",
  // Payment session
  "gatewayPaymentExpirationMinutes",
];

export const metadata = {
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

export default async (data: Handler) => {
  const { ctx } = data;
  ctx?.step("Fetching gateway settings");
  const settings = await models.settings.findAll({
    where: {
      key: GATEWAY_SETTINGS_KEYS,
    },
  });

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
  ctx?.success("Request completed successfully");

  return settingsMap;
};
