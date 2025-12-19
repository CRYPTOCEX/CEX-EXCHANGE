import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific Staking Position",
  operationId: "deleteStakingPosition",
  tags: ["Staking", "Admin", "Positions"],
  logModule: "ADMIN_STAKE",
  logTitle: "Delete Staking Position",
  parameters: deleteRecordParams("Staking Position"),
  responses: deleteRecordResponses("Staking Position"),
  requiresAuth: true,
  permission: "delete.staking.position",
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "stakingPosition",
    id: params.id,
    query,
  });
};
