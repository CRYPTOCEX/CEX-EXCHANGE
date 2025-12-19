import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates a Forex investment status",
  description: "Updates the status of a specific Forex investment. Valid statuses are ACTIVE, COMPLETED, CANCELLED, or REJECTED.",
  operationId: "updateForexInvestmentStatus",
  tags: ["Admin", "Forex", "Investment"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the forex investment to update",
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
  responses: updateRecordResponses("Forex Investment"),
  requiresAuth: true,
  permission: "edit.forex.investment",
  logModule: "ADMIN_FOREX",
  logTitle: "Update forex investment status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Validating forex investment ${id}`);

  ctx?.step(`Updating forex investment status to ${status}`);
  const result = await updateStatus("forexInvestment", id, status);

  ctx?.success("Forex investment status updated successfully");
  return result;
};
