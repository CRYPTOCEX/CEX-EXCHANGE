import { createError } from "@b/utils/error";
import { authenticateGatewayApi } from "@b/utils/gateway";

export const metadata: OperationObject = {
  summary: "Validate API key",
  description:
    "Validates an API key and returns information about the merchant and permissions.",
  operationId: "validateApiKey",
  tags: ["Gateway", "API Key"],
  logModule: "GATEWAY",
  logTitle: "Validate Gateway",
  responses: {
    200: {
      description: "API key is valid",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              valid: { type: "boolean" },
              merchant: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  status: { type: "string" },
                  verificationStatus: { type: "string" },
                },
              },
              mode: { type: "string", enum: ["LIVE", "TEST"] },
              permissions: {
                type: "array",
                items: { type: "string" },
              },
              keyType: { type: "string", enum: ["PUBLIC", "SECRET"] },
            },
          },
        },
      },
    },
    401: {
      description: "Invalid or missing API key",
    },
    403: {
      description: "API key is disabled or merchant is suspended",
    },
  },
  requiresAuth: false, // Uses API key auth instead
};

export default async (data: Handler) => {
  const { headers, ctx } = data;

  ctx?.step("Fetching validate gateway");

  // Authenticate using API key
  const apiKeyHeader = headers?.["x-api-key"] || headers?.["X-API-Key"];

  if (!apiKeyHeader) {
    throw createError({
      statusCode: 401,
      message: "API key is required",
    });
  }

  const clientIp = headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
                   headers?.["x-real-ip"] ||
                   headers?.["cf-connecting-ip"] ||
                   null;
  const { merchant, apiKey, isTestMode, isSecretKey } =
    await authenticateGatewayApi(apiKeyHeader, clientIp);

  ctx?.success("Validate Gateway retrieved successfully");

  return {
    valid: true,
    merchant: {
      id: merchant.id,
      name: merchant.name,
      status: merchant.status,
      verificationStatus: merchant.verificationStatus,
    },
    mode: isTestMode ? "TEST" : "LIVE",
    permissions: apiKey.permissions || ["*"],
    keyType: isSecretKey ? "SECRET" : "PUBLIC",
  };
};
