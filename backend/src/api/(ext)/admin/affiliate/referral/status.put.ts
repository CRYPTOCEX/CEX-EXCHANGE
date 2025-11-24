import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of MLM Referrals",
  operationId: "bulkUpdateMlmReferralStatus",
  tags: ["Admin", "MLM Referrals"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of MLM Referral IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: ["PENDING", "ACTIVE", "REJECTED"],
              description: "New status to apply to the MLM Referrals",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("MLM Referral"),
  requiresAuth: true,
  permission: "edit.affiliate.referral",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("mlmReferral", ids, status);
};
