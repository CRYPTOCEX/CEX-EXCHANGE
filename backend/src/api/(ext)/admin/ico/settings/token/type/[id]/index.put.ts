import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Update a specific Token Type Configuration",
  description: "Updates a token type configuration for ICO admin.",
  operationId: "updateTokenType",
  tags: ["ICO", "Admin", "TokenTypes"],
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
  responses: updateRecordResponses("Token Type"),
  requiresAuth: true,
  permission: "edit.ico.settings",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { name, value, description, status } = body;
  if (!name || !value || !description) {
    throw createError({
      statusCode: 400,
      message: "Missing required fields: name, value and description",
    });
  }
  const statusFlag = status === undefined ? true : status;
  return await updateRecord("icoTokenType", id, {
    name,
    value,
    description,
    status: statusFlag,
  });
};
