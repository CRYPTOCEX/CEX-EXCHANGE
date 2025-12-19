import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Delete ICO Launch Plan",
  description:
    "Deletes a specific ICO launch plan by ID. Supports both soft delete (default) and permanent delete based on query parameter.",
  operationId: "deleteIcoLaunchPlan",
  tags: ["Admin", "ICO", "Settings"],
  parameters: deleteRecordParams("Launch Plan"),
  responses: deleteRecordResponses("Launch Plan"),
  requiresAuth: true,
  permission: "edit.ico.settings",
  logModule: "ADMIN_ICO",
  logTitle: "Delete launch plan",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Validating launch plan");

  ctx?.step("Deleting launch plan");
  const result = await handleSingleDelete({
    model: "icoLaunchPlan",
    id: params.id,
    query,
  });

  ctx?.success("Launch plan deleted successfully");
  return result;
};
