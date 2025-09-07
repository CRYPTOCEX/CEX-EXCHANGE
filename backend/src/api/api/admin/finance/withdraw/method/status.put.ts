import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of withdraw methods",
  operationId: "bulkUpdateWithdrawaethodStatus",
  tags: ["Admin", "Withdraw Methods"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of withdraw method IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the withdraw methods (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Withdraw Method"),
  requiresAuth: true,
  permission: "edit.withdraw.method",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("withdrawMethod", ids, status);
};
