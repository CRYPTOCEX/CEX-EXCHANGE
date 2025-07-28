import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Enabled Token Type Configurations",
  description: "Retrieves all enabled token type configurations for users.",
  operationId: "getEnabledTokenTypes",
  tags: ["ICO", "TokenTypes"],
  responses: {
    200: {
      description: "Enabled token type configurations retrieved successfully.",
      content: {
        "application/json": {
          schema: { type: "array", items: { type: "object" } },
        },
      },
    },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const enabledTokenTypes = await models.icoTokenType.findAll({
    where: { status: true },
  });
  return enabledTokenTypes;
};
