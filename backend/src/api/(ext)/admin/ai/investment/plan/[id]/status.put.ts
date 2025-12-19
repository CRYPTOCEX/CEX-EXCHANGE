import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates AI Investment Plan status",
  operationId: "updateAiInvestmentPlanStatus",
  tags: ["Admin", "AI Investment", "Plan"],
  description:
    "Updates the active/inactive status of a specific AI Investment Plan. Use this endpoint to quickly activate or deactivate a plan without modifying other properties.",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "ID of the AI Investment Plan to update",
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
  responses: updateRecordResponses("AI Investment Plan"),
  requiresAuth: true,
  permission: "edit.ai.investment.plan",
  logModule: "ADMIN_AI",
  logTitle: "Update plan status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Updating plan ${id} status to ${status ? 'active' : 'inactive'}`);
  const result = await updateStatus("aiInvestmentPlan", id, status);

  ctx?.success("Plan status updated");
  return result;
};
