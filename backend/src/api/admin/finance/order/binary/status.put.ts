import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of binary orders",
  operationId: "bulkUpdateBinaryOrderStatus",
  tags: ["Admin", "Binary Orders"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of binary order IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              description: "New status to apply to the binary orders",
              enum: ["PENDING", "WIN", "LOSS", "DRAW"],
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Binary Order"),
  requiresAuth: true,
  permission: "edit.binary.order",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("binaryOrder", ids, status);
};
