import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "List ICO Token Types",
  description:
    "Retrieves all token type configurations for ICO offerings. Supports optional filtering by status to retrieve only active token types.",
  operationId: "getIcoTokenTypes",
  tags: ["Admin", "ICO", "Settings"],
  requiresAuth: true,
  parameters: [
    {
      name: "status",
      in: "query",
      description: "Filter by status - set to 'true' to retrieve only active token types",
      required: false,
      schema: { type: "string", enum: ["true", "false"] },
    },
  ],
  responses: {
    200: {
      description: "Token type configurations retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", description: "Display name of the token type" },
                value: { type: "string", description: "Unique identifier value for the token type" },
                description: { type: "string", description: "Description of the token type" },
                status: { type: "boolean", description: "Whether the token type is active" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
                deletedAt: { type: "string", format: "date-time", nullable: true },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "view.ico.settings",
  logModule: "ADMIN_ICO",
  logTitle: "Get token types",
};

export default async (data: Handler) => {
  const { user, query, ctx } = data;

  ctx?.step("Validating user permissions");
  if (!user?.id) {
    ctx?.fail("Unauthorized access");
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Admin privileges required.",
    });
  }

  ctx?.step("Building query filters");
  const enabledOnly = query?.status === "true";
  const whereClause = enabledOnly ? { status: true } : {};

  ctx?.step("Fetching token types");
  const tokenTypes = await models.icoTokenType.findAll({ where: whereClause });

  ctx?.success(`Retrieved ${tokenTypes.length} token types`);
  return tokenTypes;
};
