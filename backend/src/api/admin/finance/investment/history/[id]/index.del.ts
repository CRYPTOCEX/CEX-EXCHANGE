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
  logModule: "ADMIN_FIN",
  logTitle: "Delete Investment History",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Validating investment ID");

  ctx?.step("Deleting investment record");
  const result = await handleSingleDelete({
    model: "investment",
    id: params.id,
    query,
  });

  ctx?.success();
  return result
};
