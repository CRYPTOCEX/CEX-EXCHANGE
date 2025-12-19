// /server/api/admin/deposit/gateways/[id]/status.put.ts
import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Updates the status of an investment plan",
  operationId: "updateInvestmentPlanStatus",
  tags: ["Admin", "Investment Plans"],
  logModule: "ADMIN_FIN",
  logTitle: "Update Plan Status",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the investment plan to update",
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
              type: "boolean",
              description:
                "New status to apply (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Investment Plan"),
  requiresAuth: true,
  permission: "edit.investment.plan",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Updating investment plan status");

  const result = await updateStatus("investmentPlan", id, status);

  ctx?.success("Investment plan status updated successfully");
  return result;
};
