// /server/api/api-key/[id].delete.ts
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Deletes an API key",
  description: "Deletes an API key by its ID.",
  operationId: "deleteApiKey",
  tags: ["API Key Management"],
  logModule: "USER",
  logTitle: "Delete API key",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "The ID of the API key to delete",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "API key deleted successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    404: { description: "API key not found" },
    500: { description: "Server error" },
  },
  requiresAuth: true,
};

export default async (data) => {
  const { user, params, ctx } = data;
  if (!user) {
    ctx?.fail("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;

  ctx?.step("Finding API key");
  const apiKey = await models.apiKey.findOne({
    where: { id, userId: user.id },
  });
  if (!apiKey) {
    ctx?.fail("API Key not found");
    throw createError({ statusCode: 404, message: "API Key not found" });
  }

  ctx?.step("Deleting API key");
  await apiKey.destroy({ force: true });

  ctx?.success("API Key deleted successfully");
  return { message: "API Key deleted successfully" };
};
