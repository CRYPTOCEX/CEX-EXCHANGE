import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of MLM Referral Conditions",
  operationId: "bulkUpdateMlmReferralConditionStatus",
  tags: ["Admin", "MLM Referral Conditions"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of MLM Referral Condition IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description: "New status to apply to the MLM Referral Conditions",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("MLM Referral Condition"),
  requiresAuth: true,
  permission: "edit.affiliate.condition",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("mlmReferralCondition", ids, status);
};
