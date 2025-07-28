import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Update Token Type Status",
  description:
    "Updates only the status of a token type configuration for ICO admin.",
  operationId: "updateTokenTypeStatus",
  tags: ["ICO", "Admin", "TokenTypes"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the token type to update status",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "New status for the token type configuration",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description: "Token type status",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Token Type Status"),
  requiresAuth: true,
  permission: "edit.ico.settings",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  if (status === undefined) {
    throw createError({
      statusCode: 400,
      message: "Missing required field: status",
    });
  }
  return await updateRecord("icoTokenType", id, { status });
};
