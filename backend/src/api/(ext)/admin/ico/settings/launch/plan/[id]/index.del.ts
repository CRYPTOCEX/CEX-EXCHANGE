import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Delete a specific Launch Plan",
  operationId: "deleteLaunchPlan",
  tags: ["Admin", "LaunchPlans"],
  parameters: deleteRecordParams("Launch Plan"),
  responses: deleteRecordResponses("Launch Plan"),
  requiresAuth: true,
  permission: "edit.ico.settings",
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "icoLaunchPlan",
    id: params.id,
    query,
  });
};
