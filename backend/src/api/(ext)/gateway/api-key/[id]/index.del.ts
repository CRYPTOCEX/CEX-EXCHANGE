import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Delete API key pair",
  description: "Deletes an API key and its corresponding pair (public + secret).",
  operationId: "deleteApiKey",
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
      description: "API key pair deleted",
    },
    404: {
      description: "API key not found",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Delete API Key Pair",
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

  ctx?.step("Find API key to delete");

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

  ctx?.step("Find and delete API key pair");

  // Find the pair key (same name pattern, same mode, different type)
  const baseName = apiKey.name.replace(" (Public)", "").replace(" (Secret)", "");
  const pairType = apiKey.type === "PUBLIC" ? "SECRET" : "PUBLIC";
  const pairSuffix = pairType === "PUBLIC" ? " (Public)" : " (Secret)";

  const pairKey = await models.gatewayApiKey.findOne({
    where: {
      merchantId: merchant.id,
      mode: apiKey.mode,
      type: pairType,
      name: `${baseName}${pairSuffix}`,
    },
  });

  // Delete both keys
  await apiKey.destroy();
  if (pairKey) {
    await pairKey.destroy();
  }

  ctx?.success("API key pair deleted successfully");

  return {
    message: "API key pair deleted successfully",
    deletedCount: pairKey ? 2 : 1,
  };
};
