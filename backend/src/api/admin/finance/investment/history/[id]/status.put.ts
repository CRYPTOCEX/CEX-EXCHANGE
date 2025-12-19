import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata = {
  summary: "Updates the status of a Investment",
  operationId: "updateInvestmentStatus",
  tags: ["Admin", "Investments"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Investment to update",
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
              enum: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
              description: "New status to apply",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Investment"),
  requiresAuth: true,
  permission: "edit.investment",
  logModule: "ADMIN_FIN",
  logTitle: "Update Investment Status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Validating investment ID and status");

  ctx?.step("Updating investment status");
  const result = await updateStatus("investment", id, status);

  ctx?.success();
  return result
};
