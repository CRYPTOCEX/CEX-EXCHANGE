import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of Investments",
  operationId: "bulkUpdateInvestmentStatus",
  tags: ["Admin", "Investments"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of Investment IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
              description: "New status to apply to the Investments",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Investment"),
  requiresAuth: true,
  permission: "edit.investment",
  logModule: "ADMIN_FIN",
  logTitle: "Bulk Update Investment Status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step("Validating investment IDs and status");

  ctx?.step("Bulk updating investment status");
  const result = await updateStatus("investment", ids, status);

  ctx?.success();
  return result
};
