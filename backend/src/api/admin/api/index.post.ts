import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { apiKeyStoreSchema, apiKeyUpdateSchema } from "./utils";
import { generateApiKey } from "@b/api/user/api-key/utils";

export const metadata: OperationObject = {
  summary: "Stores a new API Key",
  operationId: "storeApiKey",
  tags: ["Admin", "API Keys"],
  logModule: "ADMIN_API",
  logTitle: "Create API",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: apiKeyUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(apiKeyStoreSchema, "API Key"),
  requiresAuth: true,
  permission: "create.api.key",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { userId, name, type, permissions, ipRestriction, ipWhitelist } = body;

  ctx?.step("Validating API key data");
  // Ensure permissions and IP whitelist have the correct format
  const formattedPermissions = Array.isArray(permissions) ? permissions : [];
  const formattedIPWhitelist = Array.isArray(ipWhitelist) ? ipWhitelist : [];

  ctx?.step("Generating API key");
  ctx?.step("Creating API key record");
  const result = await storeRecord({
    model: "apiKey",
    data: {
      userId,
      name,
      key: generateApiKey(), // Function to generate a secure API key
      type,
      permissions: formattedPermissions,
      ipRestriction,
      ipWhitelist: formattedIPWhitelist,
    },
  });
  ctx?.success();
  return result;
};
