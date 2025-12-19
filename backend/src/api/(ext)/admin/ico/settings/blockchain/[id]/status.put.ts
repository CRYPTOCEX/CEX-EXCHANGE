import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";
import {
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update ICO Blockchain Status",
  description:
    "Updates only the status field of a blockchain configuration. Used to enable or disable blockchains for ICO token offerings.",
  operationId: "updateIcoBlockchainStatus",
  tags: ["Admin", "ICO", "Settings"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the blockchain to update status",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "New status for the blockchain configuration",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description: "Blockchain status",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Blockchain status updated successfully",
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
  logTitle: "Update blockchain status",
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

  ctx?.step("Updating blockchain status");
  const result = await updateRecord("icoBlockchain", id, { status });

  ctx?.success("Blockchain status updated successfully");
  return result;
};
