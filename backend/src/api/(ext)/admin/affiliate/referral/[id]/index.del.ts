import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific MLM Referral",
  operationId: "deleteMlmReferral",
  tags: ["Admin", "MLM", "Referrals"],
  parameters: deleteRecordParams("MLM Referral"),
  responses: deleteRecordResponses("MLM Referral"),
  permission: "delete.affiliate.referral",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "mlmReferral",
    id: params.id,
    query,
  });
};
