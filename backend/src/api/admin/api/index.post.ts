import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { apiKeyStoreSchema, apiKeyUpdateSchema } from "./utils";
import { generateApiKey } from "@b/api/user/api-key/utils";

export const metadata: OperationObject = {
  summary: "Stores a new API Key",
  operationId: "storeApiKey",
  tags: ["Admin", "API Keys"],
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
  const { body } = data;
  const { userId, name, type, permissions, ipRestriction, ipWhitelist } = body;

  // Ensure permissions and IP whitelist have the correct format
  const formattedPermissions = Array.isArray(permissions) ? permissions : [];
  const formattedIPWhitelist = Array.isArray(ipWhitelist) ? ipWhitelist : [];

  return await storeRecord({
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
};
