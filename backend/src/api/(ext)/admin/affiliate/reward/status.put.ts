import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the claimed status of MLM Referral Rewards",
  operationId: "bulkUpdateMlmReferralRewardStatus",
  tags: ["Admin", "MLM Referral Rewards"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of MLM Referral Reward IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New claimed status to apply (true for claimed, false for unclaimed)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("MLM Referral Reward"),
  requiresAuth: true,
  permission: "edit.affiliate.reward",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  const isClaimed = status;
  return updateStatus(
    "mlmReferralReward",
    ids,
    isClaimed,
    undefined,
    "Referral Reward"
  );
};
