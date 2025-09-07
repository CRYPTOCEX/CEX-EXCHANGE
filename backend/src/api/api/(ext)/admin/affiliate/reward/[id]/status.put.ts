import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates the claimed status of an MLM Referral Reward",
  operationId: "updateMlmReferralRewardStatus",
  tags: ["Admin", "MLM Referral Rewards"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the MLM referral reward to update",
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
                "New claimed status to apply (true for claimed, false for unclaimed)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("MLM Referral Reward"),
  requiresAuth: true,
  permission: "edit.affiliate.reward",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  const isClaimed = status;
  return updateStatus(
    "mlmReferralReward",
    id,
    isClaimed,
    undefined,
    "Referral Reward"
  );
};
