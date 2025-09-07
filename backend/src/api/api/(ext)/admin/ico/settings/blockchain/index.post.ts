import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Create a New Blockchain Configuration",
  description: "Creates a new blockchain configuration for ICO admin.",
  operationId: "createBlockchain",
  tags: ["ICO", "Admin", "Blockchain"],
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
              description: "The display name of the blockchain.",
            },
            value: {
              type: "string",
              description: "The unique value identifier for the blockchain.",
            },
            status: {
              type: "boolean",
              description: "Status flag. Defaults to true if not provided.",
            },
          },
          required: ["name", "value"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Blockchain configuration created successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              blockchain: { type: "object" },
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
  const { name, value, status } = body;
  if (!name || !value) {
    throw createError({
      statusCode: 400,
      message: "Missing required fields: name, value and description",
    });
  }
  const statusFlag = status === undefined ? true : status;
  await models.icoBlockchain.create({
    name,
    value,
    status: statusFlag,
  });
  return {
    message: "Blockchain configuration created successfully.",
  };
};
