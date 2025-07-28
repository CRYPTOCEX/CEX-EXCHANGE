import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Updates an API key",
  description:
    "Updates an API key's details such as permissions, IP whitelist, or IP restriction.",
  operationId: "updateApiKey",
  tags: ["API Key Management"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "The ID of the API key to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "Data for updating the API key",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            permissions: {
              type: "array",
              items: { type: "string" },
              description: "Updated permissions associated with the API key",
            },
            ipWhitelist: {
              type: "array",
              items: { type: "string" },
              description: "Updated IP whitelist for the API key",
            },
            ipRestriction: {
              type: "boolean",
              description:
                "Updated IP restriction setting (true for restricted, false for unrestricted)",
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "API key updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              permissions: { type: "array", items: { type: "string" } },
              ipWhitelist: { type: "array", items: { type: "string" } },
              ipRestriction: { type: "boolean" },
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
  const { user, params, body } = data;
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  const { id } = params;
  const { permissions, ipWhitelist, ipRestriction } = body;

  const apiKey = await models.apiKey.findOne({
    where: { id, userId: user.id },
  });
  if (!apiKey)
    throw createError({ statusCode: 404, message: "API Key not found" });

  // Validate and sanitize inputs
  const updatedFields: Record<string, any> = {};
  if (permissions !== undefined) updatedFields.permissions = permissions;
  if (ipWhitelist !== undefined) updatedFields.ipWhitelist = ipWhitelist;
  if (ipRestriction !== undefined)
    updatedFields.ipRestriction = Boolean(ipRestriction);

  // Update only the provided fields
  const updatedApiKey = await apiKey.update(updatedFields);

  return updatedApiKey;
};
