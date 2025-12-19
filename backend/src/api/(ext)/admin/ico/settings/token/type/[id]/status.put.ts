import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";
import {
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update ICO Token Type Status",
  description:
    "Updates only the status field of a token type configuration. Used to enable or disable token types for ICO offerings.",
  operationId: "updateIcoTokenTypeStatus",
  tags: ["Admin", "ICO", "Settings"],
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
  responses: {
    200: {
      description: "Token type status updated successfully",
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
  logTitle: "Update token type status",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Validating status field");
  if (status === undefined) {
    ctx?.fail("Missing required field: status");
    throw createError({
      statusCode: 400,
      message: "Missing required field: status",
    });
  }

  ctx?.step("Updating token type status");
  const result = await updateRecord("icoTokenType", id, { status });

  ctx?.success("Token type status updated successfully");
  return result;
};
