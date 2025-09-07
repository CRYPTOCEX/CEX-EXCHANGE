// /server/api/api-key/index.get.ts
import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Lists all API keys",
  description: "Retrieves all API keys associated with the authenticated user.",
  operationId: "listApiKeys",
  tags: ["API Key Management"],
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
  const { user } = data;
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  const apiKeys = await models.apiKey.findAll({
    where: { userId: user.id },
  });

  return apiKeys;
};
