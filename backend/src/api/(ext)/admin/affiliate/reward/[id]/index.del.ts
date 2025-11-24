import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific MLM Referral Reward",
  operationId: "deleteMlmReferralReward",
  tags: ["Admin", "MLM", "Referral Rewards"],
  parameters: deleteRecordParams("MLM Referral Reward"),
  responses: deleteRecordResponses("MLM Referral Reward"),
  permission: "delete.affiliate.reward",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "mlmReferralReward",
    id: params.id,
    query,
  });
};
