// /server/api/api-key/index.get.ts
import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Lists all API keys",
  description: "Retrieves all API keys associated with the authenticated user.",
  operationId: "listApiKeys",
  tags: ["API Key Management"],
  logModule: "USER",
  logTitle: "List API keys",
  responses: {
    200: {
      description: "API keys retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                key: { type: "string" },
                permissions: { type: "array", items: { type: "string" } },
                ipWhitelist: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Server error" },
  },
  requiresAuth: true,
};

export default async (data) => {
  const { user, ctx } = data;
  if (!user) {
    ctx?.fail("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Retrieving API keys");
  const apiKeys = await models.apiKey.findAll({
    where: { userId: user.id },
  });

  ctx?.success(`Retrieved ${apiKeys.length} API keys`);
  return apiKeys;
};
