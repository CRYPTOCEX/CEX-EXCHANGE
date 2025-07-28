import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Updates the status of a binary order",
  operationId: "updateBinaryOrderStatus",
  tags: ["Admin", "Binary Order"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the binary order to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description: "New status to apply",
              enum: ["PENDING", "WIN", "LOSS", "DRAW"],
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Binary Order"),
  requiresAuth: true,
  permission: "edit.binary.order",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  return updateStatus("binaryOrder", id, status);
};
