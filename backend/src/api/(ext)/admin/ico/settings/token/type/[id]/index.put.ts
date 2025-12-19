import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";
import {
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update ICO Token Type",
  description:
    "Updates an existing token type configuration for ICO offerings. All required fields must be provided.",
  operationId: "updateIcoTokenType",
  tags: ["Admin", "ICO", "Settings"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the token type to update",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "New data for the token type configuration",
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
      description: "Token type updated successfully",
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
    404: notFoundResponse("Token Type"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ico.settings",
  logModule: "ADMIN_ICO",
  logTitle: "Update token type",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
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

  ctx?.step("Updating token type");
  const result = await updateRecord("icoTokenType", id, {
    name,
    value,
    description,
    status: statusFlag,
  });

  ctx?.success("Token type updated successfully");
  return result;
};
