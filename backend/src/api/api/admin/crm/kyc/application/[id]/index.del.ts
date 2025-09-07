import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a KYC application",
  operationId: "deleteKycApplication",
  tags: ["Admin", "CRM", "KYC"],
  parameters: deleteRecordParams("KYC application"),
  responses: deleteRecordResponses("KYC application"),
  permission: "delete.kyc.application",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "kycApplication",
    id: params.id,
    query,
  });
};
