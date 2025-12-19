import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  badRequestResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Create ICO Blockchain Configuration",
  description:
    "Creates a new blockchain configuration for ICO token offerings. The blockchain must have a unique name and value identifier.",
  operationId: "createIcoBlockchain",
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
              description: "The display name of the blockchain",
            },
            value: {
              type: "string",
              description: "The unique value identifier for the blockchain",
            },
            status: {
              type: "boolean",
              description: "Status flag. Defaults to true if not provided",
            },
          },
          required: ["name", "value"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Blockchain configuration created successfully",
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
    400: badRequestResponse,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "edit.ico.settings",
  logModule: "ADMIN_ICO",
  logTitle: "Create blockchain configuration",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;

  ctx?.step("Validating user permissions");
  if (!user?.id) {
    ctx?.fail("Unauthorized access");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { name, value, status } = body;

  ctx?.step("Validating blockchain data");
  if (!name || !value) {
    ctx?.fail("Missing required fields");
    throw createError({
      statusCode: 400,
      message: "Missing required fields: name, value and description",
    });
  }

  const statusFlag = status === undefined ? true : status;

  ctx?.step("Creating blockchain configuration");
  await models.icoBlockchain.create({
    name,
    value,
    status: statusFlag,
  });

  ctx?.success("Blockchain configuration created successfully");
  return {
    message: "Blockchain configuration created successfully.",
  };
};
