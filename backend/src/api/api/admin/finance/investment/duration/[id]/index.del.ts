import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a specific Investment duration",
  operationId: "deleteInvestmentDuration",
  tags: ["Admin", "Investment", "Durations"],
  parameters: deleteRecordParams("Investment duration"),
  responses: deleteRecordResponses("Investment duration"),
  permission: "delete.investment.duration",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "investmentDuration",
    id: params.id,
    query,
  });
};
