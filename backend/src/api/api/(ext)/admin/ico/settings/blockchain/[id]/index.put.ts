import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Update a specific Blockchain Configuration",
  description: "Updates a blockchain configuration for ICO admin.",
  operationId: "updateBlockchain",
  tags: ["ICO", "Admin", "Blockchain"],
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
  responses: updateRecordResponses("Blockchain Configuration"),
  requiresAuth: true,
  permission: "edit.ico.settings",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { name, value, status } = body;
  if (!name || !value) {
    throw createError({
      statusCode: 400,
      message: "Missing required fields: name, value and description",
    });
  }
  const statusFlag = status === undefined ? true : status;
  return await updateRecord("icoBlockchain", id, {
    name,
    value,
    status: statusFlag,
  });
};
