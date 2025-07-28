import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates the active status of an MLM Referral Condition",
  operationId: "updateMlmReferralConditionStatus",
  tags: ["Admin", "MLM Referral Conditions"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the MLM referral condition to update",
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
                "New active status to apply (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("MLM Referral Condition"),
  requiresAuth: true,
  permission: "edit.affiliate.condition",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  return updateStatus(
    "mlmReferralCondition",
    id,
    status,
    undefined,
    "Referral Condition"
  );
};
