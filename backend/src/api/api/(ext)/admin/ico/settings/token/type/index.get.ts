import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Token Type Configurations",
  description: "Retrieves all token type configurations for ICO admin.",
  operationId: "getTokenTypes",
  tags: ["ICO", "Admin", "TokenTypes"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Token type configurations retrieved successfully.",
      content: {
        "application/json": {
          schema: { type: "array", items: { type: "object" } },
        },
      },
    },
    401: { description: "Unauthorized – Admin privileges required." },
    500: { description: "Internal Server Error" },
  },
  permission: "view.ico.settings",
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Admin privileges required.",
    });
  }

  const enabledOnly = query?.status === "true";
  const whereClause = enabledOnly ? { status: true } : {};

  const tokenTypes = await models.icoTokenType.findAll({ where: whereClause });
  return tokenTypes;
};
