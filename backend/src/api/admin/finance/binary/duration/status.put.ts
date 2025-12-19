import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of binary durations",
  operationId: "bulkUpdateBinaryDurationStatus",
  tags: ["Admin", "Binary Durations"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of binary duration IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the binary durations (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Binary Duration"),
  requiresAuth: true,
  permission: "edit.binary.duration",
  logModule: "ADMIN_BINARY",
  logTitle: "Bulk update binary duration status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating status for ${ids.length} binary duration(s)`);
  const result = await updateStatus("binaryDuration", ids, status);

  ctx?.success("Binary duration status updated successfully");
  return result;
};