import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Update Blockchain Status",
  description:
    "Updates only the status of a blockchain configuration for ICO admin.",
  operationId: "updateBlockchainStatus",
  tags: ["ICO", "Admin", "Blockchain"],
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
  responses: updateRecordResponses("Blockchain Status"),
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
  return await updateRecord("icoBlockchain", id, { status });
};
