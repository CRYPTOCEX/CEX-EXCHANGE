import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { mlmReferralRewardUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific MLM Referral Reward",
  operationId: "updateMlmReferralReward",
  tags: ["Admin", "MLM Referral Rewards"],
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the MLM Referral Reward to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the MLM Referral Reward",
    content: {
      "application/json": {
        schema: mlmReferralRewardUpdateSchema,
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
  const updatedFields = {
    reward: body.reward,
    isClaimed: body.isClaimed,
  };

  return await updateRecord("mlmReferralReward", id, updatedFields);
};
