import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  badRequestResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Create ICO Token Type",
  description:
    "Creates a new token type configuration for ICO offerings. Token types define the category of tokens (e.g., ERC-20, BEP-20, utility, security).",
  operationId: "createIcoTokenType",
  tags: ["Admin", "ICO", "Settings"],
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
              description: "The display name of the token type",
            },
            value: {
              type: "string",
              description: "The unique value identifier for the token type",
            },
            description: {
              type: "string",
              description: "A description of the token type",
            },
            status: {
              type: "boolean",
              description: "Status flag. Defaults to true if not provided",
            },
          },
          required: ["name", "value", "description"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Token type configuration created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              tokenType: {
                type: "object",
                description: "The created token type",
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "edit.ico.settings",
  logModule: "ADMIN_ICO",
  logTitle: "Create token type",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;

  ctx?.step("Validating user permissions");
  if (!user?.id) {
    ctx?.fail("Unauthorized access");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { name, value, description, status } = body;

  ctx?.step("Validating token type data");
  if (!name || !value || !description) {
    ctx?.fail("Missing required fields");
    throw createError({
      statusCode: 400,
      message: "Missing required fields: name, value and description",
    });
  }

  const statusFlag = status === undefined ? true : status;

  ctx?.step("Creating token type");
  const tokenType = await models.icoTokenType.create({
    name,
    value,
    description,
    status: statusFlag,
  });

  ctx?.success("Token type created successfully");
  return {
    message: "Token type configuration created successfully.",
    tokenType,
  };
};
