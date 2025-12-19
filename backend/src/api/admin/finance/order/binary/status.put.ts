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
  logModule: "ADMIN_FIN",
  logTitle: "Bulk Update Binary Order Status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step("Update Binary Order Status...");
  const result = await updateStatus("binaryOrder", ids, status);

  ctx?.success("Bulk Update Binary Order Status completed successfully");
  return result;
};
