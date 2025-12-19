import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  generateApiKey,
  hashApiKey,
  getLastFourChars,
} from "@b/utils/gateway";

export const metadata: OperationObject = {
  summary: "Rotate API key",
  description: "Rotates an API key, generating a new key value.",
  operationId: "rotateApiKey",
  tags: ["Gateway", "Merchant", "API Keys"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "API key rotated",
    },
    404: {
      description: "API key not found",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Rotate API Key",
};

export default async (data: Handler) => {
  const { user, params, ctx } = data;
  const { id } = params;

  ctx?.step("Validate user authentication");

  if (!user?.id) {
    ctx?.fail("Unauthorized - no user ID");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Find merchant account");

  // Find merchant
  const merchant = await models.gatewayMerchant.findOne({
    where: { userId: user.id },
  });

  if (!merchant) {
    ctx?.fail("Merchant account not found");
    throw createError({
      statusCode: 404,
      message: "Merchant account not found",
    });
  }

  ctx?.step("Find API key to rotate");

  // Find API key
  const apiKey = await models.gatewayApiKey.findOne({
    where: {
      id,
      merchantId: merchant.id,
    },
  });

  if (!apiKey) {
    ctx?.fail("API key not found");
    throw createError({
      statusCode: 404,
      message: "API key not found",
    });
  }

  ctx?.step("Generate new API key");

  // Generate new key
  const fullKey = generateApiKey(apiKey.keyPrefix);

  // Update key
  await apiKey.update({
    keyHash: hashApiKey(fullKey),
    lastFourChars: getLastFourChars(fullKey),
    lastUsedAt: null,
    lastUsedIp: null,
  });

  ctx?.success("API key rotated successfully");

  return {
    id: apiKey.id,
    name: apiKey.name,
    key: fullKey, // Full key only shown once
    keyPreview: `${apiKey.keyPrefix}...${apiKey.lastFourChars}`,
    type: apiKey.type,
    mode: apiKey.mode,
    note: "Save this new key securely. The old key is now invalid.",
  };
};
