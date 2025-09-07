import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { generateApiKey } from "./utils";

export const metadata: OperationObject = {
  summary: "Creates a new API key",
  description: "Generates a new API key for the authenticated user.",
  operationId: "createApiKey",
  tags: ["API Key Management"],
  requestBody: {
    description: "Data required to create a new API key",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the API key" },
            permissions: {
              type: "array",
              items: { type: "string" },
              description: "Permissions associated with the API key",
            },
            ipWhitelist: {
              type: "array",
              items: { type: "string" },
              description: "IP addresses whitelisted for the API key",
            },
            ipRestriction: {
              type: "boolean",
              description:
                "Restrict access to specific IPs (true) or allow unrestricted access (false)",
            },
          },
          required: ["name"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "API key created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              key: { type: "string" },
              permissions: { type: "array", items: { type: "string" } },
              ipWhitelist: { type: "array", items: { type: "string" } },
              ipRestriction: { type: "boolean" },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    400: { description: "API key limit reached" },
    500: { description: "Server error" },
  },
  requiresAuth: true,
};

export default async (data) => {
  const { user, body } = data;
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  const { name, permissions, ipWhitelist, ipRestriction } = body;

  // Check the number of API keys the user has
  const existingApiKeys = await models.apiKey.count({
    where: { userId: user.id },
  });

  if (existingApiKeys >= 10) {
    throw createError({
      statusCode: 400,
      message: "You have reached the limit of 10 API keys.",
    });
  }

  const newKey = await models.apiKey.create({
    userId: user.id,
    name: name,
    key: generateApiKey(), // Use the custom API key generator
    permissions: permissions || [],
    ipWhitelist: ipWhitelist || [],
    ipRestriction: ipRestriction ?? false,
    type: "user",
  });

  return newKey;
};
