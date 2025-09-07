// /server/api/admin/deposit/gateways/[id]/status.put.ts
import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Updates the status of an investment plan",
  operationId: "updateInvestmentPlanStatus",
  tags: ["Admin", "Investment Plans"],
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
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  return updateStatus("investmentPlan", id, status);
};
