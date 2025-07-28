import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a specific investment",
  operationId: "deleteInvestment",
  tags: ["Admin", "General", "Investments"],
  parameters: deleteRecordParams("investment"),
  responses: deleteRecordResponses("investment"),
  permission: "delete.investment",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "investment",
    id: params.id,
    query,
  });
};
