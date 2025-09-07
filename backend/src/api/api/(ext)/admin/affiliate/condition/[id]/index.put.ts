import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { mlmReferralConditionUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific MLM Referral Condition",
  operationId: "updateMlmReferralCondition",
  tags: ["Admin", "MLM Referral Conditions"],
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the MLM Referral Condition to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the MLM Referral Condition",
    content: {
      "application/json": {
        schema: mlmReferralConditionUpdateSchema,
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
  const updatedFields = {
    status: body.status,
    type: body.type,
    reward: body.reward,
    rewardType: body.rewardType,
    rewardWalletType: body.rewardWalletType,
    rewardCurrency: body.rewardCurrency,
    rewardChain: body.rewardChain,
    image: body.image,
  };

  return await updateRecord("mlmReferralCondition", id, updatedFields);
};
