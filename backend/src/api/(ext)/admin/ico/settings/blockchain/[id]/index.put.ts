import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";
import {
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update ICO Blockchain Configuration",
  description:
    "Updates an existing blockchain configuration for ICO token offerings. All fields must be provided.",
  operationId: "updateIcoBlockchain",
  tags: ["Admin", "ICO", "Settings"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the blockchain to update",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "New data for the blockchain configuration",
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
      description: "Blockchain configuration updated successfully",
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
    404: notFoundResponse("Blockchain Configuration"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ico.settings",
  logModule: "ADMIN_ICO",
  logTitle: "Update blockchain configuration",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
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

  ctx?.step("Updating blockchain configuration");
  const result = await updateRecord("icoBlockchain", id, {
    name,
    value,
    status: statusFlag,
  });

  ctx?.success("Blockchain configuration updated successfully");
  return result;
};
