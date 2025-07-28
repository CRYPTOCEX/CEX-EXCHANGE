import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Update Status for an MLM Referral",
  operationId: "updateMlmReferralStatus",
  tags: ["Admin", "MLM Referrals"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the MLM Referral to update",
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
              enum: ["PENDING", "ACTIVE", "REJECTED"],
              description: "New status to apply to the MLM Referral",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("MLM Referral"),
  requiresAuth: true,
  permission: "edit.affiliate.referral",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  return updateStatus("mlmReferral", id, status);
};
