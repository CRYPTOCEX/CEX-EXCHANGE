import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Create a New Token Type Configuration",
  description: "Creates a new token type configuration for ICO admin.",
  operationId: "createTokenType",
  tags: ["ICO", "Admin", "TokenTypes"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The display name of the token type.",
            },
            value: {
              type: "string",
              description: "The unique value identifier for the token type.",
            },
            description: {
              type: "string",
              description: "A description of the token type.",
            },
            status: {
              type: "boolean",
              description: "Status flag. Defaults to true if not provided.",
            },
          },
          required: ["name", "value", "description"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Token type configuration created successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              tokenType: { type: "object" },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized – Admin privileges required." },
    400: { description: "Bad Request" },
    500: { description: "Internal Server Error" },
  },
  permission: "edit.ico.settings",
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { name, value, description, status } = body;
  if (!name || !value || !description) {
    throw createError({
      statusCode: 400,
      message: "Missing required fields: name, value and description",
    });
  }
  const statusFlag = status === undefined ? true : status;
  const tokenType = await models.icoTokenType.create({
    name,
    value,
    description,
    status: statusFlag,
  });
  return {
    message: "Token type configuration created successfully.",
    tokenType,
  };
};
