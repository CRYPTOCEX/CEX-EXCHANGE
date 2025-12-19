import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of binary markets",
  operationId: "bulkUpdateBinaryMarketStatus",
  tags: ["Admin", "Binary Markets"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of binary market IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the binary markets (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Binary Market"),
  requiresAuth: true,
  permission: "edit.binary.market",
  logModule: "ADMIN_BINARY",
  logTitle: "Bulk update binary market status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating status for ${ids.length} binary market(s)`);
  const result = await updateStatus("binaryMarket", ids, status);

  ctx?.success("Binary market status updated successfully");
  return result;
};